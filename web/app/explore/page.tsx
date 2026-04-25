"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Youtube, FileText, Sparkles, TrendingUp, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

type ExploreItem = {
  id: number;
  kind: "youtube" | "web";
  rawUrl: string;
  normalizedUrl: string;
  title: string | null;
  createdAt: string;
  creator: {
    id: number;
    slug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    ownedEoaAddress: string | null;
  };
  lifetimeEarnedUsdc: string;
  paymentCount: number;
  onchainSettledCount: number;
  trending7dUsdc: string;
  viewerCount: number;
  sessionCount: number;
};

type Sort = "recent" | "trending" | "earnings";
type KindFilter = "all" | "youtube" | "web";

export default function ExplorePage() {
  const [sort, setSort] = useState<Sort>("recent");
  const [kind, setKind] = useState<KindFilter>("all");
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/explore?sort=${sort}&kind=${kind}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, [sort, kind]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted">
          <Compass size={14} /> Discover
        </div>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Creators paid by the <span className="text-accent">second</span>.
        </h1>
        <p className="max-w-2xl text-muted">
          Every paragraph read or second watched flows USDC from your balance to the creator's
          wallet — settled onchain on Arc Testnet via Circle Gateway. No subscriptions. No tipping
          buttons.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 text-sm">
          <FilterTab active={kind === "all"} onClick={() => setKind("all")}>
            All
          </FilterTab>
          <FilterTab active={kind === "youtube"} onClick={() => setKind("youtube")}>
            <Youtube size={14} /> YouTube
          </FilterTab>
          <FilterTab active={kind === "web"} onClick={() => setKind("web")}>
            <FileText size={14} /> Articles
          </FilterTab>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <SortTab active={sort === "recent"} onClick={() => setSort("recent")}>
            <Clock size={14} /> Recent
          </SortTab>
          <SortTab active={sort === "trending"} onClick={() => setSort("trending")}>
            <TrendingUp size={14} /> Trending 7d
          </SortTab>
          <SortTab active={sort === "earnings"} onClick={() => setSort("earnings")}>
            <Sparkles size={14} /> Top earning
          </SortTab>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-border p-12 text-center text-muted">
          No content yet. Be the first creator —{" "}
          <Link href="/auth/signup" className="text-accent hover:underline">
            sign up
          </Link>{" "}
          and register a URL.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}

function ContentCard({ item }: { item: ExploreItem }) {
  const earned = parseFloat(item.lifetimeEarnedUsdc);
  const slug = item.creator.slug;
  return (
    <Card className="group overflow-hidden bg-creator-card transition-all hover:border-accent/40 hover:bg-surface-2/60">
      <div className="flex items-center gap-3 border-b border-border/60 p-4">
        <Avatar
          size={36}
          name={item.creator.displayName}
          email={null}
          seed={slug ?? String(item.creator.id)}
          src={item.creator.avatarUrl ?? undefined}
        />
        <div className="min-w-0 flex-1">
          {slug ? (
            <Link href={`/c/${slug}`} className="block truncate text-sm font-medium hover:underline">
              {item.creator.displayName ?? slug}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">{item.creator.displayName ?? "—"}</span>
          )}
          <div className="font-mono text-[10px] uppercase text-muted">
            {slug ? `mtrly/c/${slug}` : "anonymous"}
          </div>
        </div>
        <Badge variant="kind">
          {item.kind === "youtube" ? <Youtube size={10} /> : <FileText size={10} />}
          {item.kind}
        </Badge>
      </div>

      <CardContent className="space-y-3 pt-4">
        <div className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-snug">
          {item.title ?? <span className="text-muted">{item.normalizedUrl}</span>}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-bg/40 p-2 text-center">
          <Stat label="viewers" value={item.viewerCount.toString()} />
          <Stat label="earned" value={`$${earned.toFixed(4)}`} accent />
          <Stat label="onchain" value={item.onchainSettledCount.toString()} green />
        </div>

        <div className="flex items-center justify-between">
          <a
            href={item.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-[10px] uppercase text-muted hover:text-fg"
          >
            open <ExternalLink size={10} />
          </a>
          {parseFloat(item.trending7dUsdc) > 0 && (
            <Badge variant="warn">
              <TrendingUp size={10} /> ${parseFloat(item.trending7dUsdc).toFixed(4)}/7d
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent, green }: { label: string; value: string; accent?: boolean; green?: boolean }) {
  return (
    <div>
      <div
        className={cn(
          "font-mono text-sm tabular-nums",
          accent && "text-accent",
          green && "text-green-400",
        )}
      >
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase text-muted">{label}</div>
    </div>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
        active ? "bg-surface text-fg" : "text-muted hover:bg-surface hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function SortTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors",
        active ? "border border-accent/40 bg-accent/10 text-accent" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-56 animate-pulse rounded-xl border border-border bg-surface/50" />
      ))}
    </div>
  );
}
