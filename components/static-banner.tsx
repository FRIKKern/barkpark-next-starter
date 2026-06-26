import { staticModeActive } from "@/lib/static";

/**
 * Shown only in **static demo mode** (no Barkpark configured) — a thin notice
 * that the content is a bundled snapshot, with the one command to go live.
 * Renders nothing once a real Barkpark is connected.
 */
export function StaticBanner() {
  if (!staticModeActive()) return null;
  return (
    <div className="w-full border-b border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-900 dark:text-amber-200">
      <span className="font-semibold">Static demo</span> — a bundled snapshot, no
      Barkpark connected. Run{" "}
      <code className="rounded bg-amber-500/15 px-1 font-mono">
        npm run new-project &lt;name&gt;
      </code>{" "}
      to go live, or see{" "}
      <a
        className="underline underline-offset-2"
        href="https://github.com/FRIKKern/barkpark-next-starter#deploy-vercel"
      >
        going live
      </a>
      .
    </div>
  );
}
