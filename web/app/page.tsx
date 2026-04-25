import Link from "next/link";
import { LiveTicker } from "@/components/LiveTicker";
import { TopCreatorsStrip } from "@/components/TopCreatorsStrip";
import { TopArticlesStrip } from "@/components/TopArticlesStrip";
import { TrendingStrip } from "@/components/TrendingStrip";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-8 py-16">
      <div className="font-mono text-sm text-muted">mtrly.v0.1.0 · arc testnet</div>

      <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-6xl">
        Content, metered by the <span className="text-accent">second</span>.
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-muted">
        Pay $0.05/min for video. $0.005/paragraph for text. No subscriptions.
        No wallets to approve. Install the extension, top up once, consume anywhere.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/auth/signup"
          className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-bg hover:opacity-90"
        >
          Get started →
        </Link>
        <Link
          href="/explore"
          className="rounded-lg border border-border px-5 py-3 text-sm hover:border-fg"
        >
          Explore creators
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-lg border border-border px-5 py-3 text-sm hover:border-fg"
        >
          Leaderboard
        </Link>
      </div>

      <div className="mt-24 grid grid-cols-1 gap-6 border-t border-border pt-12 md:grid-cols-3">
        <Stat label="Price / minute" value="$0.05" sub="video, per-second billed" />
        <Stat label="Price / paragraph" value="$0.005" sub="text, per paragraph viewed" />
        <Stat label="Gas paid by viewer" value="$0.00" sub="Circle Nanopayments" />
      </div>

      <section className="mt-20 border-t border-border pt-12">
        <div className="font-mono text-xs uppercase text-muted">Try it in two minutes</div>
        <ol className="mt-6 space-y-3 text-base">
          <li>
            <span className="font-mono text-accent">1.</span>{" "}
            <Link href="/auth/signup" className="underline">Sign up</Link> — an Arc-testnet wallet is provisioned for you by Circle.
          </li>
          <li>
            <span className="font-mono text-accent">2.</span>{" "}
            <a href="/mtrly-extension.zip" className="underline">Download the Chrome extension</a>
            {" "}(or <span className="font-mono text-sm">git clone</span> and point to{" "}
            <span className="font-mono text-sm">mtrly/extension/</span>), then{" "}
            <span className="font-mono text-sm">chrome://extensions</span> → Developer mode → Load unpacked.
          </li>
          <li>
            <span className="font-mono text-accent">3.</span>{" "}
            Visit <Link href="/demo/article" className="underline">the demo article</Link> and scroll — each paragraph unlocks for $0.005.
          </li>
          <li>
            <span className="font-mono text-accent">4.</span>{" "}
            Or watch{" "}
            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              this YouTube video
            </a>
            {" "}— the meter ticks every 5s while playback runs.
          </li>
        </ol>
      </section>

      <div className="mt-20">
        <TrendingStrip />
      </div>

      <div className="mt-20">
        <TopCreatorsStrip />
      </div>

      <div className="mt-20">
        <TopArticlesStrip />
      </div>

      <section className="mt-20 border-t border-border pt-12">
        <div className="font-mono text-xs uppercase text-muted">Live onchain activity</div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every tick settles as a real batched transfer on Arc Testnet via Circle Gateway.
          Click any tx to inspect on arcscan.
        </p>
        <div className="mt-6">
          <LiveTicker />
        </div>
      </section>

      <footer className="mt-24 border-t border-border pt-8 font-mono text-xs text-muted">
        Built for Agentic Economy on Arc · Apr 20–26, 2026 · MIT
      </footer>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="font-mono text-xs uppercase text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  );
}
