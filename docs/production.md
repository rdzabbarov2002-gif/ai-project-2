# Production readiness

What has to be true before public traffic (Phase 7), how each part is
checked, and what the owner sets up by hand. Incidents: `docs/runbook.md`.

## Content Security Policy

Every page gets a policy with a fresh nonce (`lib/csp.ts`, set by
`middleware.ts`): only the app's own scripts run, the browser connects
only to the app, Supabase and Sentry, and nothing may frame the app. The
end-to-end tests run under it and fail on any violation
(`e2e/csp.spec.ts`).

Rollout on a new production deployment:

1. Set `CSP_REPORT_ONLY=true` for Production in Vercel and deploy. The
   browser now reports what the policy would block instead of blocking
   it (`frame-ancestors 'none'` stays enforced — `next.config.js`).
2. For at least **3 days** of real traffic, look at the reports: Sentry →
   Issues, search `csp`, and Vercel logs for `csp: violation`. Each issue
   is one directive and blocked origin. Explain every one:
   - blocked `https://<something>` in `connect-src`/`script-src` — a
     service the app really needs? Add it to `lib/csp.ts`, with a test;
   - `inline` or `eval` from the app's own pages — a bug, fix it;
   - a URL from a browser extension or an injected ad — not ours. (The
     endpoint already drops `chrome-extension:` and similar.)
3. Once three days pass without an unexplained report, delete
   `CSP_REPORT_ONLY` and redeploy — the policy is enforced. Check:
   `curl -sI https://<domain>/ | grep -i content-security-policy` shows
   `content-security-policy:` (not `-report-only`) with `'nonce-…'`.
