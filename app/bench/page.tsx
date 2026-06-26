import type { Metadata } from "next";
import Link from "next/link";
import { Bench } from "@/components/bench";
import { staticModeActive } from "@/lib/static";

export const metadata: Metadata = {
  title: "Engine benchmark · Barkpark",
  description:
    "Latency benchmark across Postgres and Indx search engines, with Next.js Data Cache off/on.",
};

export default function BenchPage() {
  // The benchmark times the REAL Postgres + Indx engines. In static demo mode
  // there is no Barkpark and no engine — running it would report meaningless
  // numbers under engine labels, so be honest and gate it on a live connection.
  if (staticModeActive()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Engine benchmark</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          This benchmarks Barkpark&rsquo;s real <strong>Postgres</strong> and{" "}
          <strong>Indx</strong> search engines. The app is in{" "}
          <strong>static demo mode</strong> — there&rsquo;s no Barkpark connected,
          so there are no engines to measure.
        </p>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Connect a Barkpark (<code className="font-mono">npm run new-project</code>{" "}
          or set the env vars) and reload to run it.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm underline underline-offset-2"
        >
          ← Back to the finder
        </Link>
      </main>
    );
  }
  return <Bench />;
}
