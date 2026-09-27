// Load smoke test (Phase 7): N people at once go through the main path —
// dashboard → a tool → a generation → history — a few times each, and the
// run fails if 1% or more of the requests fail, or if a generation the app
// answered wasn't saved. The AI must be the local
// stand-in (e2e/mock-anthropic.mjs): the script stops at the first
// generation that isn't the stand-in's answer, before any real spend.
//
//   node e2e/mock-anthropic.mjs &     # MOCK_AI_DELAY_MS=2000 for a realistic AI call
//   ANTHROPIC_BASE_URL=http://127.0.0.1:4010 npm run start &
//   node scripts/load-smoke.mjs [--users 50] [--rounds 3]
//
// Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY: it creates the accounts through the Auth
// admin API and deletes them (and everything they made) at the end. Runs
// only against localhost, unless --allow-remote (a staging deployment
// whose AI points at the stand-in — never production).
import { createServerClient } from "@supabase/ssr";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const USERS = option("users", 50);
const ROUNDS = option("rounds", 3);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MOCK_OUTPUT_PREFIX = "E2E mock copy";
const PASSWORD = "load-smoke-password-1";

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE_URL) && !args.includes("--allow-remote")) {
  console.error(`${BASE_URL} isn't local. For a staging deployment with the AI stand-in, add --allow-remote.`);
  process.exit(1);
}

const admin = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "content-type": "application/json" };
const run = Date.now().toString(36);

async function createAccount(index) {
  const email = `load-${run}-${index}@load.test`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`creating ${email}: ${res.status} ${await res.text()}`);
  return { email, id: (await res.json()).id };
}

async function deleteAccount(id) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
}

/** Signs in the way the app does and returns the session cookies it would hold. */
async function sessionCookie(email) {
  const jar = new Map();
  const supabase = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  for (let attempt = 0; ; attempt++) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
    if (!error) break;
    // Auth limits sign-ins per IP; the sign-ins are setup, not the test.
    if (error.status !== 429 || attempt > 30) throw new Error(`signing in ${email}: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

const results = new Map(); // step → { ok, failed, ms[] , errors: Map }
function record(step, ok, ms, detail) {
  const entry = results.get(step) ?? { ok: 0, failed: 0, ms: [], errors: new Map() };
  results.set(step, entry);
  entry.ms.push(ms);
  if (ok) entry.ok += 1;
  else {
    entry.failed += 1;
    entry.errors.set(detail, (entry.errors.get(detail) ?? 0) + 1);
  }
}

let aborted = null;

async function step(name, cookie, path, init = {}, check = () => true) {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      redirect: "manual",
      headers: { cookie, ...(init.headers ?? {}) },
    });
    const body = await res.text();
    const ok = res.status === 200 && check(body);
    record(name, ok, performance.now() - started, ok ? "" : `HTTP ${res.status} ${body.slice(0, 120)}`);
    return body;
  } catch (error) {
    record(name, false, performance.now() - started, String(error.cause?.code ?? error.message));
    return "";
  }
}

async function person(cookie) {
  for (let round = 0; round < ROUNDS && !aborted; round++) {
    await step("GET /dashboard", cookie, "/dashboard");
    await step("GET /tools/ad-generator", cookie, "/tools/ad-generator");
    await step(
      "POST /api/generate",
      cookie,
      "/api/generate",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toolSlug: "ad-generator",
          inputParams: { platform: "Facebook", productOrService: "Coffee beans", callToAction: "Shop Now" },
        }),
      },
      (body) => {
        const output = JSON.parse(body).output ?? "";
        if (!output.startsWith(MOCK_OUTPUT_PREFIX)) aborted = "the app isn't using the AI stand-in";
        return !aborted;
      },
    );
    await step("GET /history", cookie, "/history");
  }
}

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
};

console.log(`Load smoke: ${USERS} people at once, ${ROUNDS} rounds each, against ${BASE_URL}`);
const accounts = [];
try {
  for (let i = 0; i < USERS; i++) accounts.push(await createAccount(i));
  const cookies = [];
  for (const { email } of accounts) cookies.push(await sessionCookie(email));

  const started = performance.now();
  await Promise.all(cookies.map((cookie) => person(cookie)));
  const seconds = (performance.now() - started) / 1000;

  if (aborted) {
    console.error(`Stopped: ${aborted}. Start the app with ANTHROPIC_BASE_URL=http://127.0.0.1:4010.`);
    process.exitCode = 1;
  } else {
    let total = 0;
    let failed = 0;
    console.log("\nstep                       requests  failed    p50 ms    p95 ms    max ms");
    for (const [name, entry] of results) {
      total += entry.ok + entry.failed;
      failed += entry.failed;
      const row = [
        name.padEnd(26),
        String(entry.ok + entry.failed).padStart(8),
        String(entry.failed).padStart(8),
        ...[50, 95, 100].map((p) => String(Math.round(percentile(entry.ms, p))).padStart(10)),
      ];
      console.log(row.join(""));
      for (const [detail, count] of entry.errors) console.log(`    ${count}× ${detail}`);
    }
    const rate = (failed / total) * 100;
    console.log(`\n${total} requests in ${seconds.toFixed(1)} s, ${failed} failed (${rate.toFixed(2)}%)`);

    // Every generation the app answered is in the database.
    const generated = results.get("POST /api/generate")?.ok ?? 0;
    const ids = accounts.map(({ id }) => id).join(",");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/generations?user_id=in.(${ids})&select=id`, {
      method: "HEAD",
      headers: { ...admin, Prefer: "count=exact" },
    });
    const saved = Number(res.headers.get("content-range")?.split("/")[1]);
    console.log(`${generated} generations answered, ${saved} saved`);

    if (rate >= 1) {
      console.error("FAIL: 1% or more of the requests failed.");
      process.exitCode = 1;
    } else if (saved !== generated) {
      console.error("FAIL: not every generation was saved.");
      process.exitCode = 1;
    } else {
      console.log("PASS: under 1% of the requests failed, every generation saved.");
    }
  }
} finally {
  await Promise.all(accounts.map(({ id }) => deleteAccount(id)));
}
