import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import type { Metadata } from "next";
import { Sparkles, Wallet, ShieldCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ContentCard } from "@/components/ContentCard";
import { TipJar } from "@/components/TipJar";
import { TipsFeed } from "@/components/TipsFeed";
import ShareRow from "./ShareRow";

export const dynamic = "force-dynamic";

type CreatorResp = {
  ok: true;
  creator: {
    id: number;
    slug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    role: string;
    walletAddress: string | null;
    ownedEoaAddress: string | null;
    createdAt: string;
  };
  content: Array<{
    id: number;
    kind: "youtube" | "web";
    title: string | null;
    description: string | null;
    previewImageUrl: string | null;
    rawUrl: string | null;
    normalizedUrl: string | null;
    createdAt: string;
    lifetimeEarnedUsdc: string;
    paymentCount: number;
    onchainSettledCount: number;
    viewerCount: number;
    sessionCount: number;
  }>;
  stats: {
    lifetimeEarnedUsdc: string;
    lifetimePaymentCount: number;
    onchainSettledCount: number;
    contentCount: number;
  };
};

async function fetchCreator(slug: string): Promise<CreatorResp | null> {
  const h = headers();
  const host = h.get("host") ?? "circlearc-59513674.slonix.dev";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const cookieHeader = cookies().toString();
  const res = await fetch(`${proto}://${host}/api/creator/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.ok) return null;
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await fetchCreator(params.slug);
  if (!data) return { title: "Creator not found · Mtrly" };
  const c = data.creator;
  const earned = parseFloat(data.stats.lifetimeEarnedUsdc).toFixed(4);
  const title = `${c.displayName ?? c.slug} on Mtrly`;
  const description =
    c.bio ?? `Pay-per-second creator on Arc Testnet. Lifetime earned: $${earned} USDC.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CreatorPage({ params }: { params: { slug: string } }) {
  const data = await fetchCreator(params.slug);
  if (!data) notFound();

  const c = data.creator;
  const stats = data.stats;
  const settleAddr = c.ownedEoaAddress ?? c.walletAddress;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="rounded-2xl border border-border bg-creator-card p-6 md:p-10">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <Avatar
            size={104}
            name={c.displayName}
            email={null}
            seed={c.slug ?? String(c.id)}
            src={c.avatarUrl ?? undefined}
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase text-muted">
              <span>mtrly · creator</span>
              <span>·</span>
              <span>joined {new Date(c.createdAt).toLocaleDateString()}</span>
              <Badge variant="onchain">
                <ShieldCheck size={10} /> Active on Arc Testnet
              </Badge>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              {c.displayName ?? c.slug}
            </h1>
            <div className="mt-1 font-mono text-xs text-muted">/c/{c.slug}</div>
            {c.bio && <p className="mt-3 max-w-xl text-muted">{c.bio}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {settleAddr && (
                <a
                  href={`https://testnet.arcscan.app/address/${settleAddr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-green-400/40 bg-green-400/10 px-3 py-1.5 font-mono text-[11px] uppercase text-green-400 hover:bg-green-400/15"
                >
                  <Wallet size={12} /> Verify wallet on arcscan <ExternalLink size={10} />
                </a>
              )}
              <ShareRow slug={c.slug ?? ""} name={c.displayName ?? c.slug ?? "creator"} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Lifetime earned" value={`$${parseFloat(stats.lifetimeEarnedUsdc).toFixed(4)}`} accent />
          <Stat label="Payments" value={stats.lifetimePaymentCount.toString()} />
          <Stat label="Onchain settled" value={stats.onchainSettledCount.toString()} green />
          <Stat label="Active content" value={stats.contentCount.toString()} />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Content</h2>
          <span className="font-mono text-xs text-muted">{stats.contentCount} items</span>
        </div>
        {data.content.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-12 text-center text-muted">
            No content registered yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.content.map((item) => (
              <ContentCard
                key={item.id}
                showCreator={false}
                isAuthed={item.rawUrl != null}
                item={{
                  id: item.id,
                  kind: item.kind,
                  title: item.title,
                  description: item.description,
                  previewImageUrl: item.previewImageUrl,
                  rawUrl: item.rawUrl,
                  lifetimeEarnedUsdc: item.lifetimeEarnedUsdc,
                  paymentCount: item.paymentCount,
                  onchainSettledCount: item.onchainSettledCount,
                  viewerCount: item.viewerCount,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-10">
        <TipJar slug={c.slug ?? ""} displayName={c.displayName ?? c.slug ?? "creator"} recipientUserId={c.id} />
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Recent tips</h2>
          <span className="font-mono text-[10px] uppercase text-muted">last 6 with a note</span>
        </div>
        <div className="mt-3">
          <TipsFeed toSlug={c.slug ?? undefined} limit={6} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-6">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="mt-1 text-accent" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold">How to support {c.displayName ?? c.slug}</h3>
            <p className="mt-1 text-sm text-muted">
              Two ways: (1) Tip jar above, one-shot bonus that settles immediately. (2) Per-second
              metering, top up your balance once, install the extension, and read/watch their
              content; every paragraph or second flows USDC to their wallet through Circle Gateway.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/auth/signup"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
              >
                Sign up to support
              </Link>
              <Link
                href="/balance"
                className="rounded-lg border border-border px-4 py-2 text-sm hover:border-fg"
              >
                Top up balance
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, accent, green }: { label: string; value: string; accent?: boolean; green?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-bg/40 p-3">
      <div className="font-mono text-[10px] uppercase text-muted">{label}</div>
      <div
        className={[
          "mt-1 font-mono text-xl tabular-nums",
          accent ? "text-accent" : "",
          green ? "text-green-400" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

