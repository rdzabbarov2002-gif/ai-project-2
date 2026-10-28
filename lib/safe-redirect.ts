/**
 * Validates a user-controlled "where to go next" value (the `?next=`
 * middleware adds on its redirect to /login) before it reaches
 * `redirect()`. Only same-origin absolute paths pass: anything else —
 * `https://evil.example`, protocol-relative `//evil.example`, the
 * backslash variant browsers normalize to the same thing, or a missing
 * value — falls back to `fallback`. Without this, /login?next=… was an
 * open redirect (found in Phase 1).
 */
export function safeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters (tabs/newlines are stripped by URL parsers, which
  // can turn "/\t/evil.example" back into a protocol-relative URL).
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
