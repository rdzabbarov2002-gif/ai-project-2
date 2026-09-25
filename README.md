# AI Marketing Workspace

Built and tested entirely from a phone, via a cloud IDE (Replit or bolt.new)
+ Vercel preview deploys — no local machine required.

## Getting this running (from your phone)

1. **Import into Replit or bolt.new**
   - Replit: create a new Repl → "Import from GitHub" (after you push this
     to a repo via GitHub's mobile web UI or the Replit Git pane), or
     upload this folder as a zip.
   - bolt.new: open bolt.new in your phone browser and upload/paste this
     project.
2. **Install dependencies** — the cloud IDE runs `npm install` for you
   (no terminal needed on your end, just tap "Run"). This has not been
   run yet in any environment this project has been built in so far —
   it is the first real, live step for this codebase.
3. **Set up Supabase** — create a project at supabase.com, then apply
   `supabase/schema.sql` and `supabase/seed.sql` via the SQL Editor (see
   `supabase/README.md` for the exact steps and for applying only the
   newest migrations if you're re-syncing an existing project).
4. **Environment variables** — `.env.local` already exists in this
   project (copied from `.env.example`, and already git-ignored) with
   every variable the code actually reads — fill in the real values:
   Supabase URL/anon key/service-role key (from your new project's
   Settings → API) and your Anthropic API key. Everything else has a
   working default. Values can be entered through Replit's/bolt.new's
   Secrets panel, no terminal needed.
5. **Connect to GitHub → Vercel**
   - Push the Repl/bolt.new project to a GitHub repo (both have a built-in
     Git panel — no `git` CLI needed).
   - Import that repo into Vercel (vercel.com, works fully in a mobile
     browser). Every push gets a preview URL you can open on your phone.
6. **Run locally in the cloud IDE** to see live-reload while editing; use
   the Vercel preview link to check it exactly as a real visitor would.

## Status

MVP design and implementation (Stage 1–15) is complete — see the 15
per-stage audit reports for what was built and why. The project is now in
the post-design build/launch sequence: Phase 1 (first build) is in
progress. Nothing in this codebase has been installed, built, or run
against a live Supabase/Anthropic environment yet — that first real run
happens the moment `npm install` succeeds somewhere with network access,
which this project's own development environment never had.

