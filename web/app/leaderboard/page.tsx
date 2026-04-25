"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Medal, ExternalLink, Heart, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

type Item = {
  rank: number;
  userId: number;
  slug: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  ownedEoaAddress: string | null;
  lifetimeEarnedUsdc: string;
  paymentCount: number;
  onchainSettledCount: number;
  contentCount: number;
};

type Window = "7d" | "30d" | "all";
type Variant = "all" | "tips" | "ticks";

export default function LeaderboardPage() {
  const [win, setWin] = useState<Window>("all");
  const [variant, setVariant] = useState<Variant>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?window=${win}&type=${variant}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setHasMore((data.items ?? []).length >= 20);
      })
      .finally(() => setLoading(false));
  }, [win, variant]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    const data = await fetch(
      `/api/leaderboard?window=${win}&type=${variant}&limit=20&offset=${items.length}`,
    ).then((r) => r.json());
    const next = data.items ?? [];
    setItems((prev) => [...prev, ...next]);
    setHasMore(next.length >= 20);
    setLoadingMore(false);
  }

  const top3 = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted">
          <Trophy size={14} /> Leaderboard
        </div>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Top creators on <span className="text-accent">Mtrly</span>.
        </h1>
        <p className="max-w-2xl text-muted">
          Ranked by lifetime USDC earned per-second. Every dollar is settled onchain on Arc Testnet
          via Circle Gateway — click any creator to verify their wallet on arcscan.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {(["all", "30d", "7d"] as Window[]).map((w) => (
            <button
              key={w}
              onClick={() => setWin(w)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
                win === w ? "bg-bg text-fg" : "text-muted hover:text-fg",
              )}
            >
              {w === "all" ? "All time" : w === "30d" ? "30 days" : "7 days"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          <VariantTab active={variant === "all"} onClick={() => setVariant("all")}>
            <Coins size={13} /> All earnings
          </VariantTab>
          <VariantTab active={variant === "ticks"} onClick={() => setVariant("ticks")}>
            <Trophy size={13} /> Per-second
          </VariantTab>
          <VariantTab active={variant === "tips"} onClick={() => setVariant("tips")}>
            <Heart size={13} /> Tips only
          </VariantTab>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-surface/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-border p-12 text-center text-muted">
          No earnings yet in this window.
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {top3.map((item, i) => (
                <PodiumCard key={item.userId} item={item} order={i} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <>
            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr className="text-left font-mono text-[10px] uppercase text-muted">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Creator</th>
                    <th className="px-4 py-3 text-right">Earned</th>
                    <th className="px-4 py-3 text-right">Onchain</th>
                    <th className="hidden px-4 py-3 text-right md:table-cell">Content</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((item) => (
                    <tr key={item.userId} className="border-t border-border hover:bg-surface/50">
                      <td className="px-4 py-3 font-mono text-xs text-muted">{item.rank}</td>
                      <td className="px-4 py-3">
                        <CreatorRow item={item} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                        ${parseFloat(item.lifetimeEarnedUsdc).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.onchainSettledCount > 0 ? (
                          <Badge variant="onchain">{item.onchainSettledCount}</Badge>
                        ) : (
                          <span className="font-mono text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-xs text-muted md:table-cell">
                        {item.contentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-border bg-surface px-5 py-2 text-sm hover:border-fg disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
            </>
          )}
        </>
      )}
    </main>
  );
}

function VariantTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
        active ? "bg-bg text-fg" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

const PODIUM_ICONS = [
  { Icon: Crown, color: "text-yellow-300", border: "border-yellow-300/40", glow: "shadow-[0_0_30px_rgba(253,224,71,0.20)]" },
  { Icon: Medal, color: "text-zinc-300", border: "border-zinc-300/40", glow: "shadow-[0_0_24px_rgba(228,228,231,0.18)]" },
  { Icon: Medal, color: "text-amber-700", border: "border-amber-700/40", glow: "shadow-[0_0_24px_rgba(180,83,9,0.18)]" },
];

function PodiumCard({ item, order }: { item: Item; order: number }) {
  const meta = PODIUM_ICONS[order] ?? PODIUM_ICONS[2];
  const { Icon } = meta;
  return (
    <Card
      className={cn(
        "overflow-hidden bg-creator-card",
        meta.border,
        meta.glow,
        order === 0 && "md:scale-105",
      )}
    >
      <CardContent className="flex flex-col items-center gap-3 p-6 pt-6 text-center">
        <div className={cn("flex items-center gap-1 font-mono text-[10px] uppercase", meta.color)}>
          <Icon size={14} /> Rank #{item.rank}
        </div>
        <Avatar
          size={72}
          name={item.displayName}
          email={null}
          seed={item.slug ?? String(item.userId)}
          src={item.avatarUrl ?? undefined}
        />
        <div>
          {item.slug ? (
            <Link href={`/c/${item.slug}`} className="text-base font-semibold hover:underline">
              {item.displayName ?? item.slug}
            </Link>
          ) : (
            <span className="text-base font-semibold">{item.displayName ?? "—"}</span>
          )}
          {item.slug && (
            <div className="font-mono text-[10px] uppercase text-muted">/c/{item.slug}</div>
          )}
        </div>
        <div className="text-3xl font-semibold tabular-nums text-accent">
          ${parseFloat(item.lifetimeEarnedUsdc).toFixed(4)}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="muted">{item.paymentCount} payments</Badge>
          {item.onchainSettledCount > 0 && (
            <Badge variant="onchain">{item.onchainSettledCount} onchain</Badge>
          )}
        </div>
        {item.ownedEoaAddress && (
          <a
            href={`https://testnet.arcscan.app/address/${item.ownedEoaAddress}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-[10px] uppercase text-muted hover:text-fg"
          >
            Verify on arcscan <ExternalLink size={10} />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function CreatorRow({ item }: { item: Item }) {
  const inner = (
    <div className="flex items-center gap-2">
      <Avatar
        size={28}
        name={item.displayName}
        email={null}
        seed={item.slug ?? String(item.userId)}
        src={item.avatarUrl ?? undefined}
      />
      <span className="text-sm font-medium">{item.displayName ?? item.slug ?? "—"}</span>
    </div>
  );
  return item.slug ? (
    <Link href={`/c/${item.slug}`} className="hover:underline">
      {inner}
    </Link>
  ) : (
    inner
  );
}
