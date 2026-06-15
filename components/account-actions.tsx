"use client";

import { useState, useTransition } from "react";
import { Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deleteAccount } from "@/lib/actions/account";
import { Button, Input } from "@/components/ui/primitives";

export function AccountActions({ username }: { username: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();

  const canDelete = typed.trim() === username;

  function onDelete() {
    if (!canDelete) return;
    start(async () => {
      const res = await deleteAccount();
      // On success the action redirects; only an error returns here.
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Your data */}
      <div>
        <h2 className="text-sm font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted">Download a copy of your profile, collection, and want list as JSON.</p>
        <a
          href="/api/account/export"
          download
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-border/60 bg-foreground/[0.03] px-4 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download size={15} /> Export my data
        </a>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-300">
          <AlertTriangle size={15} /> Danger zone
        </h2>
        <p className="mt-1 text-sm text-muted">
          Permanently delete your account and all associated data — your profile, collection, and want list. This
          cannot be undone.
        </p>

        {!confirming ? (
          <Button variant="danger" className="mt-3" onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-muted">
              Type your username <span className="font-semibold text-foreground">{username}</span> to confirm:
            </label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={username}
              autoComplete="off"
              aria-label="Type your username to confirm deletion"
            />
            <div className="flex gap-2">
              <Button variant="danger" disabled={!canDelete || pending} onClick={onDelete}>
                {pending ? "Deleting…" : "Permanently delete account"}
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => { setConfirming(false); setTyped(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
