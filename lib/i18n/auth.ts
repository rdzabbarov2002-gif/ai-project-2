import type { Messages } from "./messages";

/**
 * Supabase Auth's message in the interface's language: a known message
 * from the dictionary, the "wait N seconds" one with its number, anything
 * else as Supabase wrote it.
 */
export function authErrorMessage(message: string, t: Messages): string {
  const known = t.auth.supabase[message];
  if (known) return known;
  const wait = /only request this after (\d+) seconds?/i.exec(message);
  if (wait && t.auth.supabase["wait"]) return t.auth.supabase["wait"].replace("{seconds}", wait[1]!);
  return message;
}
