"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

type Item = {
  rank: number;
  userId: number;
  slug: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lifetimeEarnedUsdc: string;
  onchainSettledCount: number;
  contentCount: number;
};

export function TopCreatorsStrip() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard?window=all&limit=6")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="border-t border-border pt-12">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted">
          <Trophy size={14} /> Top creators
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center gap-1 font-mono text-xs uppercase text-muted hover:text-fg"
        >
          full leaderboard <ArrowRight size={12} />
        </Link>
      </div>
      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface/50" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((c) => {
            const inner = (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-3 transition-colors hover:border-accent/40 hover:bg-creator-card">
                <Avatar
                  size={40}
                  name={c.displayName}
                  email={null}
                  seed={c.slug ?? String(c.userId)}
                  src={c.avatarUrl ?? undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {c.displayName ?? c.slug ?? ""}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-muted">#{c.rank}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm tabular-nums text-accent">
                    ${parseFloat(c.lifetimeEarnedUsdc).toFixed(4)}
                  </div>
                  {c.onchainSettledCount > 0 && (
                    <Badge variant="onchain" className="mt-1">
                      {c.onchainSettledCount}
                    </Badge>
                  )}
                </div>
              </div>
            );
            return c.slug ? (
              <Link key={c.userId} href={`/c/${c.slug}`}>
                {inner}
              </Link>
            ) : (
              <div key={c.userId}>{inner}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
