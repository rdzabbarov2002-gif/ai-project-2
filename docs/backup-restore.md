# Backups and restore

The database holds everything people create: accounts, company profiles,
generations, feedback. This page is how it's backed up, how to get it back,
and the drill that proves the second part works.

## What protects the data

- **Supabase's daily backups — the Pro plan and up.** A physical copy of the
  whole database, Auth users included, once a day; Pro keeps the last 7
  (Team 14, Enterprise 30). Restorable from the Dashboard (Database →
  Backups): in place, or into a new project. **The Free plan has none** —
  move the production project to Pro before real people's data is in it.
- **A logical backup — `supabase/backup.sh`.** Plain SQL files you keep
  yourself: before a risky migration, as a copy independent of Supabase, or
  to move to another project. Works on any plan.

Both contain personal data (emails, password hashes, everything people
wrote). Keep backup files encrypted, never commit them (`/backups/` is in
`.gitignore`), and delete them when they're no longer needed.

## Is the latest backup less than 24 hours old?

Dashboard → Database → Backups: the newest entry's time. Check it weekly
during the beta, and before any migration.

## Taking a logical backup

Needs Docker (the Supabase CLI runs `pg_dump` in a container) and `psql`.
`$DB_URL` is the project's connection string (Dashboard → Connect → direct
connection; use the Session pooler one if your network has no IPv6).

```bash
supabase/backup.sh dump "$DB_URL" backups/$(date +%F)
```

It writes `roles.sql`, `schema.sql`, `data.sql`, `auth-triggers.sql` and
`counts.txt` (row counts, to check a restore against).

## Restoring into a new project

1. Dashboard → New project, same region. Copy its connection string
   (`$NEW_DB_URL`).
2. Load the backup:

   ```bash
   supabase/backup.sh restore backups/2026-09-26 "$NEW_DB_URL"
   ```

   It stops at the first error, loads everything in one transaction (a
   failed restore leaves the project empty) and ends with
   `Restored: row counts match the backup.`
3. Run the checks below.
4. To switch the app over (a real recovery, not a drill): set the new
   project's URL and keys in Vercel and redeploy, and set up its Auth
   settings again — site URL, redirect URLs, SMTP, email templates
   (`supabase/README.md`) — they're project settings, not data. Everyone
   has to sign in again (the new project signs sessions with a different
   key); passwords keep working.

With a Pro backup instead of a logical one: Database → Backups → restore
into a new project, then the same checks and step 4.

### Checks after a restore

```bash
npx supabase test db --db-url "$NEW_DB_URL"   # RLS, client privileges, account deletion
npx supabase db advisors --db-url "$NEW_DB_URL" --type security --fail-on warn
```

The pgTAP tests run inside a transaction that is rolled back — they leave
nothing behind. Then run the app against the new project (`.env.local`
with its URL and keys, `npm run dev`): sign in with a test account and
open History; sign up a new account and check it reaches onboarding.

### What `backup.sh` does beyond `db dump` and `psql`

Found by the rehearsal below — the plain dump-and-restore from Supabase's
guide produced a database that looked right and wasn't:

- **The sign-up trigger was missing.** `on_auth_user_created` (migration
  0009) lives on `auth.users`, and `db dump` leaves the auth schema out of
  `schema.sql` — new accounts would get no `users` row and no plan. The
  script saves such triggers to `auth-triggers.sql` and recreates them.
- **The client privileges were gone.** A new project grants `anon` and
  `authenticated` everything on every table and function it creates; the
  dump only adds grants, never takes these away. Clients could have called
  `increment_usage_counter` and rewritten any column of their generations
  (migrations 0019 and 0022 exist to prevent both). The script removes
  those default grants before loading the schema, so the dump's own grants
  rebuild exactly the original set, and the dump then restores the
  defaults for future tables.
- Data is loaded with triggers off, so the restored accounts don't run the
  sign-up trigger a second time.

## Restore drill

Once before the beta starts, then every three months: take a backup,
restore it into a new project, run the checks, time each step, write a
line in the log below, then delete the drill project and the backup files.

### Rehearsal (local, 2026-09-26)

Source: the local stack with 2,020 accounts and 50,023 generations (84 MB).
Target: a second, empty local Supabase project — CLI 2.118.0, Postgres 17.

| Step | Time |
|---|---|
| `backup.sh dump` (69 MB of files) | 8.0 s |
| `backup.sh restore`, including the row-count check | 1.5 s |
| pgTAP (50 tests) and both advisors | ~3 s |

Row counts identical in all 13 tables; client privileges identical (29
table, column and function grants); the sign-up trigger in place. An
existing account signed in with its old password and saw only its own
history; anonymous reads were refused; a new sign-up got its `users` and
`subscriptions` rows. A hosted project will be slower — the dump and the
restore go over the network — so the real drill needs its own timing.

### Drill log

| Date | Backup | Size | Dump | Restore | Checks | Result |
|---|---|---|---|---|---|---|
| 2026-09-26 | logical, local rehearsal | 84 MB | 8.0 s | 1.5 s | pass | OK |
| | production → new project | | | | | |
