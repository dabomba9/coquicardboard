/**
 * RLS / security integration test — runs against LOCAL Supabase.
 *   npm run test:rls
 * Asserts: catalog world-readable + write-locked; per-user holdings isolation;
 * get_public_collection exposes only public profiles. Exits non-zero on failure.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SECRET) { console.error("Missing Supabase env in .env.local"); process.exit(1); }

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `  — ${detail}`}`);
  if (!ok) failures++;
}

const rest = (path: string, init: RequestInit & { token?: string } = {}) => {
  const { token, ...rest } = init;
  return fetch(`${URL}/rest/v1/${path}`, {
    ...rest,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, "Content-Type": "application/json", ...(rest.headers ?? {}) },
  });
};

async function adminCreateUser(email: string, password: string): Promise<string> {
  const r = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const j = await r.json();
  return j.id;
}
async function adminDeleteUser(id: string) {
  await fetch(`${URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE", headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
}
async function signIn(email: string, password: string): Promise<{ token: string; id: string }> {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  return { token: j.access_token, id: j.user.id };
}

async function main() {
  const stamp = Date.now();
  const aEmail = `rlstest_a_${stamp}@example.com`, bEmail = `rlstest_b_${stamp}@example.com`;
  const pw = "Passw0rd!test";
  let aId = "", bId = "";
  try {
    // 1. Catalog world-readable
    const tiers = await (await rest("tiers?select=id")).json();
    check("catalog: tiers readable by anon", Array.isArray(tiers) && tiers.length === 4, `got ${tiers.length}`);

    // 2. Catalog write-locked for anon
    const wr = await rest("cards", { method: "POST", body: JSON.stringify({ tier_id: 1, name: "hack", slug: `hack-${stamp}` }) });
    check("catalog: anon INSERT denied", wr.status === 401 || wr.status === 403, `status ${wr.status}`);

    // Users
    aId = await adminCreateUser(aEmail, pw);
    bId = await adminCreateUser(bEmail, pw);
    const a = await signIn(aEmail, pw);
    const b = await signIn(bEmail, pw);
    check("auth: alice + bob signed in", !!a.token && !!b.token);

    // trigger created profiles
    const aProf = await (await rest(`profiles?select=username,is_public&id=eq.${aId}`, { token: a.token })).json();
    check("trigger: profile auto-created", Array.isArray(aProf) && aProf.length === 1, JSON.stringify(aProf));
    const aUsername = aProf[0]?.username;

    // pick a card
    const card = (await (await rest("cards?select=id,slug&tier_id=eq.1&limit=1")).json())[0];

    // 3. Alice inserts a public, for-trade holding
    const ins = await rest("holdings", {
      method: "POST", token: a.token,
      body: JSON.stringify({ card_id: card.id, user_id: aId, condition_type: "graded", grading_company: "PSA", grade: 10, is_public: true, for_trade: true }),
    });
    check("holdings: alice insert (own user_id) ok", ins.status === 201, `status ${ins.status}`);

    // 4. Alice cannot insert as bob (WITH CHECK)
    const spoof = await rest("holdings", {
      method: "POST", token: a.token,
      body: JSON.stringify({ card_id: card.id, user_id: bId, condition_type: "raw" }),
    });
    check("holdings: insert as another user denied", spoof.status === 403 || spoof.status === 401, `status ${spoof.status}`);

    // 5. Isolation — bob sees none of alice's holdings
    const bobSees = await (await rest("holdings?select=id", { token: b.token })).json();
    check("holdings: bob cannot read alice's rows", Array.isArray(bobSees) && bobSees.length === 0, `saw ${bobSees.length}`);

    // 6. Public RPC — bob (private) returns null
    const rpc = (u: string, token = ANON) => fetch(`${URL}/rest/v1/rpc/get_public_collection`, {
      method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_username: u }),
    });
    const bProf = await (await rest(`profiles?select=username&id=eq.${bId}`, { token: b.token })).json();
    const bobPublic = await (await rpc(bProf[0].username)).json();
    check("RPC: private profile returns null", bobPublic === null, JSON.stringify(bobPublic));

    // 7. Make alice public → RPC exposes her public holding
    await rest(`profiles?id=eq.${aId}`, { method: "PATCH", token: a.token, body: JSON.stringify({ is_public: true }) });
    const alicePublic = await (await rpc(aUsername)).json();
    check("RPC: public profile returns data + holdings",
      alicePublic && alicePublic.profile?.username === aUsername && Array.isArray(alicePublic.holdings) && alicePublic.holdings.length >= 1,
      JSON.stringify(alicePublic)?.slice(0, 200));
  } finally {
    if (aId) await adminDeleteUser(aId);
    if (bId) await adminDeleteUser(bId);
  }

  console.log(`\n${failures === 0 ? "All RLS checks passed." : `${failures} RLS check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
