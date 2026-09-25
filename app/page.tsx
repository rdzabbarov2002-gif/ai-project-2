import Link from "next/link";

export default function LandingPage() {
  // Placeholder landing copy/layout — full guest landing redesign is a
  // later, dedicated stage (see Stage 6/7 scope notes). Only the /tools
  // link is new this stage: the Tools Gallery needs to be reachable from
  // somewhere.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="font-display text-2xl font-semibold">
        AI Marketing Workspace
      </h1>
      <p className="text-ink-600">Project scaffold — Stage 7 (Tools Gallery).</p>
      <div className="flex gap-3 text-sm">
        <Link href="/tools" className="text-accent hover:underline">
          Browse tools
        </Link>
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
        <Link href="/register" className="text-accent hover:underline">
          Create account
        </Link>
      </div>
    </main>
  );
}
