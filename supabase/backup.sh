#!/usr/bin/env bash
# Logical backup of the database, and its restore into an empty Supabase
# project — the procedure and its checks: docs/backup-restore.md.
#
#   supabase/backup.sh dump    <db-url> <dir>   write a backup to <dir>
#   supabase/backup.sh restore <dir> <db-url>   load it into an EMPTY project
#
# <db-url> is the project's direct connection string (Dashboard → Connect).
# Needs Docker (the Supabase CLI runs pg_dump in a container) and psql.
set -euo pipefail

SUPABASE="npx --yes supabase@2.118.0"

# Row counts of every public table and of the accounts — written with the
# backup, compared after a restore.
COUNTS="select table_schema || '.' || table_name || ' ' ||
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I',
    table_schema, table_name), false, true, '')))[1]::text
from information_schema.tables
where table_type = 'BASE TABLE'
  and (table_schema = 'public' or (table_schema = 'auth' and table_name in ('users', 'identities')))
order by 1"

# Our triggers on Supabase's own auth tables (migration 0009's
# on_auth_user_created): `db dump` leaves the auth schema out of
# schema.sql, and them with it.
AUTH_TRIGGERS="select pg_get_triggerdef(t.oid) || ';'
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth' and not t.tgisinternal"

case "${1:-}" in
  dump)
    url=$2 dir=$3
    mkdir -p "$dir"
    $SUPABASE db dump --db-url "$url" -f "$dir/roles.sql" --role-only
    $SUPABASE db dump --db-url "$url" -f "$dir/schema.sql"
    $SUPABASE db dump --db-url "$url" -f "$dir/data.sql" --use-copy --data-only
    psql "$url" -Atq -c "set search_path = ''" -c "$AUTH_TRIGGERS" > "$dir/auth-triggers.sql"
    psql "$url" -At -c "$COUNTS" > "$dir/counts.txt"
    echo "Backup written to $dir."
    ;;
  restore)
    dir=$2 url=$3
    # A new project grants anon and authenticated everything on each new
    # table and function; the dump only adds grants, so without this the
    # restored database would lose the client privileges of migrations
    # 0019 and 0022 (clients could, e.g., call increment_usage_counter).
    # schema.sql's own ALTER DEFAULT PRIVILEGES puts the defaults back.
    psql "$url" --single-transaction -v ON_ERROR_STOP=1 -q -o /dev/null \
      -c "alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated" \
      -c "alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated" \
      -c "alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated" \
      -f "$dir/roles.sql" \
      -f "$dir/schema.sql" \
      -f "$dir/auth-triggers.sql" \
      -c "set session_replication_role = replica" \
      -f "$dir/data.sql"
    psql "$url" -At -c "$COUNTS" | diff "$dir/counts.txt" - && echo "Restored: row counts match the backup."
    ;;
  *)
    sed -n '2,9p' "$0" >&2
    exit 1
    ;;
esac
