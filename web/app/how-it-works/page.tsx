import Link from "next/link";
import {
  Compass,
  Wallet,
  Play,
  BookOpen,
  Code2,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "How Mtrly works",
  description:
    "Pay-per-second content metered through Circle Gateway on Arc Testnet — no subscriptions, no per-tick wallet popups, full onchain transparency.",
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <div className="font-mono text-xs uppercase text-muted">how mtrly works</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Three roles. One <span className="text-accent">meter</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Mtrly meters attention by the second of video or paragraph of text. USDC flows from the
          viewer&apos;s balance to the creator&apos;s wallet, batched onto Arc Testnet through
          Circle Gateway. No subscriptions. No per-tick popups. Verifiable onchain.
        </p>
      </header>

      <section className="mt-12">
        <SectionHeader icon={<Compass size={16} />} label="For viewers" />
        <Steps>
          <Step n={1} icon={<Wallet size={18} />} title="Top up once">
            Send testnet USDC to your Mtrly wallet (or have admin grant you a demo balance). One
            deposit covers thousands of seconds across every creator.
          </Step>
          <Step n={2} icon={<Play size={18} />} title="Install the extension">
            Chrome → Load unpacked from <code className="font-mono text-xs text-fg">extension/</code>. The extension watches every page you visit; if a creator
            registered the URL, the meter starts.
          </Step>
          <Step n={3} icon={<TrendingUp size={18} />} title="Watch / read anywhere">
            $0.05/min for video, $0.005 per paragraph dwelled-on for ~3 seconds. Native Mtrly
            articles work without an extension — just open <code className="font-mono text-xs text-fg">/a/&lt;id&gt;</code>.
          </Step>
        </Steps>
      </section>

      <section className="mt-16">
        <SectionHeader icon={<BookOpen size={16} />} label="For creators" />
        <Steps>
          <Step n={1} icon={<Sparkles size={18} />} title="Sign up as a creator">
            We auto-provision a Circle Wallet + a tick-signing EOA on Arc Testnet for you. Both
            visible on arcscan.
          </Step>
          <Step n={2} icon={<BookOpen size={18} />} title="Register URLs or write articles">
            Paste a YouTube link, a blog URL, or write directly inside Mtrly. URLs stay hidden from
            non-authed viewers so they can&apos;t skip the meter.
          </Step>
          <Step n={3} icon={<Wallet size={18} />} title="Earn 80% per second">
            Every paid tick credits 80% to your balance, 20% to the platform. Withdraw to any Arc
            address from your dashboard — produces 1 real onchain mint via Circle Gateway.
          </Step>
        </Steps>
      </section>

      <section className="mt-16">
        <SectionHeader icon={<Code2 size={16} />} label="For developers" />
        <Steps>
          <Step n={1} icon={<Code2 size={18} />} title="Built on x402 + Gateway">
            Each tick is an HTTP 402 Payment Required → EIP-3009 transferWithAuthorization signed
            by the viewer&apos;s EOA → batched by Circle&apos;s x402 facilitator → published as
            one onchain transfer per batch on Arc Testnet.
          </Step>
          <Step n={2} icon={<ShieldCheck size={18} />} title="Verifiable end-to-end">
            <code className="font-mono text-xs text-fg">/api/gateway/status</code> exposes the
            platform&apos;s settlement EOA + completed transfer counts; every payment row stamps{" "}
            <code className="font-mono text-xs text-fg">onchainTxHash</code> +{" "}
            <code className="font-mono text-xs text-fg">onchainFromAddress</code> after Circle
            confirms.
          </Step>
          <Step n={3} icon={<Sparkles size={18} />} title="MIT-licensed reference impl">
            Source on{" "}
            <a
              href="https://github.com/finecalex/mtrly"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              github.com/finecalex/mtrly
            </a>
            . Read{" "}
            <code className="font-mono text-xs text-fg">PRD.md</code> +{" "}
            <code className="font-mono text-xs text-fg">TECH_REFERENCE.md</code> for the full
            architecture.
          </Step>
        </Steps>
      </section>

      <section className="mt-16 grid grid-cols-1 gap-3 md:grid-cols-2">
        <PriceCard
          title="$0.05 / minute"
          sub="video"
          body="Per-second billed while the video is playing. Pause = pause meter. Refreshing rebills only the new seconds."
        />
        <PriceCard
          title="$0.005 / paragraph"
          sub="text"
          body="3-second dwell, paragraph-level. The first paragraph is always free as a teaser. Refresh-safe — paragraphs you paid stay unlocked."
        />
      </section>

      <section className="mt-16 rounded-2xl border border-accent/30 bg-creator-card p-8 text-center">
        <Sparkles size={28} className="mx-auto text-accent" />
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Try it now</h2>
        <p className="mt-2 text-sm text-muted">
          Pay-per-second is a foreign idea until you see your balance tick down a tenth of a cent.
          Costs less than one tweet to demo end-to-end.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/auth/signup"
            className="flex items-center gap-1 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg hover:opacity-90"
          >
            Sign up <ArrowRight size={14} />
          </Link>
          <Link
            href="/explore"
            className="flex items-center gap-1 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm hover:border-fg"
          >
            Browse content
          </Link>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="accent">
        {icon}
        {label}
      </Badge>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">{children}</div>;
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-surface/50">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 font-mono text-xs text-accent">
            {n}
          </span>
          <span className="text-accent">{icon}</span>
        </div>
        <h3 className="mt-3 text-base font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{children}</p>
      </CardContent>
    </Card>
  );
}

function PriceCard({ title, sub, body }: { title: string; sub: string; body: string }) {
  return (
    <Card className="bg-surface/50">
      <CardContent className="p-6">
        <div className="font-mono text-[10px] uppercase text-muted">{sub}</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums text-accent">{title}</div>
        <p className="mt-3 text-sm text-muted">{body}</p>
      </CardContent>
    </Card>
  );
}
