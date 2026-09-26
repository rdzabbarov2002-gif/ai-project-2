import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface FakeResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

export interface RecordedQuery {
  table: string;
  /** Every builder call in order, e.g. ["eq", "user_id", "u1"]. */
  calls: unknown[][];
}

/**
 * A stand-in for the supabase-js query builder: every method call is
 * recorded and returns the builder again; awaiting it resolves to whatever
 * the handler for that table returns. Enough to test the project's own
 * query-building and result-handling logic without a database — the
 * queries themselves are exercised for real by the end-to-end runs against
 * a local Supabase stack (see docs/stage8-15-completion-report.md).
 */
export function fakeSupabase(handlers: Record<string, (query: RecordedQuery) => FakeResult>) {
  const queries: RecordedQuery[] = [];

  const client = {
    from(table: string) {
      const query: RecordedQuery = { table, calls: [] };
      queries.push(query);
      const builder: unknown = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "then") {
              const result = handlers[table]?.(query) ?? {};
              const settled = {
                data: result.data ?? null,
                error: result.error ?? null,
                count: result.count ?? null,
              };
              return (resolve: (value: unknown) => unknown) => resolve(settled);
            }
            return (...args: unknown[]) => {
              query.calls.push([String(prop), ...args]);
              return builder;
            };
          },
        },
      );
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, queries };
}
