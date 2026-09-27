# Staging: the whole app on a Vercel preview, set up from a phone

A private copy of the app for checking it by hand before launch: a
Vercel **preview** deployment of a branch, with its own Supabase project.
Payments stay off (no Stripe key) and nothing is public or indexed. Every
step works in Safari on an iPhone.

## 1. Supabase project "staging"

supabase.com → New project: name `staging`, a region near you, a database
password of **letters and digits only** (it goes into a URL) — save it in
Passwords. Wait until the project is ready.

## 2. The database

1. Supabase → the project → **Connect** (top) → *Session pooler* → copy
   the URI (`postgresql://postgres.<ref>:[YOUR-PASSWORD]@…pooler.supabase.com:5432/postgres`)
   and put your password in place of `[YOUR-PASSWORD]`.
2. GitHub → the repository → Settings → Secrets and variables → Actions →
   New repository secret: name `STAGING_SUPABASE_DB_URL`, the URI as the
   value.
3. GitHub → Actions → **Deploy database (staging)** → Run workflow →
   branch `claude/stoic-franklin-0o9nt2` → Run. Green in about a minute.
4. Check: Supabase → Table Editor → `tools` has 4 rows, `templates` 20.

## 3. Sign-in settings (Supabase → Authentication)

- Sign In / Providers → Email: *Confirm email* on; minimum password
  length 8.
- URL Configuration: *Site URL* and *Redirect URLs* — the preview's
  address from step 5 (`https://<branch-url>` and `https://<branch-url>/**`).

Supabase's built-in email sends only to the addresses of your Supabase
team and a few per hour: sign up with your own address. For more test
accounts, switch *Confirm email* off for a while.

## 4. AI key

console.anthropic.com → Billing: add a little credit ($5) → Settings →
Limits: a monthly spend limit ($10) → API Keys: create one named
`staging`. Without a valid key the pages work and a generation shows an
error.

## 5. Vercel

1. vercel.com → sign up with GitHub → Add New → Project → import the
   repository. Framework: Next.js (detected); leave the build settings.
2. Environment Variables, before deploying:

   | Name | Value (Supabase → Project Settings) |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Data API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API Keys → *Legacy API keys* → `anon` |
   | `SUPABASE_SERVICE_ROLE_KEY` | API Keys → *Legacy API keys* → `service_role` (secret) |
   | `ANTHROPIC_API_KEY` | the key from step 4 |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` (optional) | your email — shown as "Contact" |

   The legacy keys are the kind the app is tested with. Deploy. That
   first deployment is of `main`, which is older code: it
   isn't the one to test.
3. Deployments → Create Deployment → branch
   `claude/stoic-franklin-0o9nt2` → Create. When it's Ready, open it →
   Domains: the address ending `-git-claude-stoic-franklin-0o9nt2-….vercel.app`
   stays the same for every new commit on the branch. Put it into step 3.

Previews are open only to you while you're signed in to Vercel in the
same browser (Settings → Deployment Protection).

## 6. Is it working?

| Open | Expect |
|---|---|
| `https://<branch-url>/api/health` | `{"status":"ok","checks":{"database":"ok"},"version":"<commit>"…}` — the commit is the branch's latest |
| `https://<branch-url>/` | the landing page with 4 tools and "20 ready-made templates" |
| `https://<branch-url>/robots.txt` | `Disallow: /` — a preview is never indexed |

A preview runs the production build (`next build` / `next start`); only
the environment name differs (`preview`).
