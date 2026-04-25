"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Medal, ExternalLink } from "lucide-react";
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

export default function LeaderboardPage() {
  const [win, setWin] = useState<Window>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?window=${win}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, [win]);

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

      <div className="mt-8 flex gap-1 rounded-lg border border-border bg-surface p-1">
        {(["all", "30d", "7d"] as Window[]).map((w) => (
          <button
            key={w}
            onClick={() => setWin(w)}
            className={cn(
              "flex-1 rounded-md px-4 py-1.5 text-sm transition-colors",
              win === w ? "bg-bg text-fg" : "text-muted hover:text-fg",
            )}
          >
            {w === "all" ? "All time" : w === "30d" ? "Last 30 days" : "Last 7 days"}
          </button>
        ))}
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
          )}
        </>
      )}
    </main>
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
