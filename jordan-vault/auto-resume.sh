#!/bin/bash
# Hourly auto-resume for the Vault image backfill (run by launchd).
# Each tick: count missing images; if done, unload the job + remove the plist;
# otherwise run the resumable downloader (pulls a batch when the home IP's
# Cloudflare rate-limit is open, exits fast when it's still cooling/blocked).
set -u
PROJ="/Users/dustinreed/projects/coqui-cardboard"
LABEL="com.coqui.vault-images"
cd "$PROJ" || exit 1
# launchd has a minimal PATH — add the nvm node bin + system tools.
export PATH="/Users/dustinreed/.nvm/versions/node/v24.12.0/bin:/usr/bin:/bin:/usr/sbin:/sbin"
LOG="$PROJ/jordan-vault/.cache/auto-resume.log"
mkdir -p "$PROJ/jordan-vault/.cache"

missing=$(/usr/bin/python3 - <<'PY'
import json, os
d = json.load(open('jordan-vault/data/cards.json'))
m = 0
for r in d:
    if r['frontImage'] and not os.path.exists(f"public/vault/{r['id']}-front.jpg"): m += 1
    if r['backImage'] and not os.path.exists(f"public/vault/{r['id']}-back.jpg"): m += 1
print(m)
PY
)
ip=$(/usr/bin/curl -s --max-time 10 https://api.ipify.org)
echo "[$(date)] tick — missing=$missing ip=$ip" >> "$LOG"

if [ "${missing:-1}" -eq 0 ]; then
  echo "[$(date)] COMPLETE — unloading $LABEL" >> "$LOG"
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null \
    || launchctl unload "$HOME/Library/LaunchAgents/$LABEL.plist" 2>/dev/null
  rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
  exit 0
fi

npx tsx jordan-vault/fetch-images.ts >> "$LOG" 2>&1
echo "[$(date)] download pass finished — syncing to Storage" >> "$LOG"
# Push any newly-downloaded images to the vault-images Storage bucket (what the
# app serves). Idempotent; targets the env's Supabase (.env.local).
npx tsx jordan-vault/upload-images.ts >> "$LOG" 2>&1
echo "[$(date)] upload sync finished" >> "$LOG"
