"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { hashGradient } from "@/lib/gradients";

type Item = {
  id: number;
  kind: "youtube" | "web" | "mtrly";
  title: string | null;
  description: string | null;
  previewImageUrl: string | null;
  lifetimeEarnedUsdc: string;
  paymentCount: number;
  onchainSettledCount: number;
  creator: {
    id: number;
    slug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export function TopArticlesStrip() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    fetch("/api/explore?kind=mtrly&sort=earnings&limit=4")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <section className="border-t border-border pt-12">
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted">
          <BookOpen size={14} /> Top articles on Mtrly
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface/50" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border pt-12">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted">
          <BookOpen size={14} /> Top articles on Mtrly
        </div>
        <Link
          href="/explore?kind=mtrly"
          className="flex items-center gap-1 font-mono text-xs uppercase text-muted hover:text-fg"
        >
          all articles <ArrowRight size={12} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((a) => {
          const grad = hashGradient(`${a.kind}-${a.id}-${a.title ?? ""}`);
          const earned = parseFloat(a.lifetimeEarnedUsdc);
          return (
            <Link
              key={a.id}
              href={`/a/${a.id}`}
              className="group flex overflow-hidden rounded-xl border border-border bg-surface/50 transition-colors hover:border-accent/40"
            >
              <div
                className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden"
                style={{ background: grad }}
              >
                <BookOpen size={22} className="text-white/70" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-3">
                <div className="line-clamp-2 text-sm font-semibold leading-snug">
                  {a.title ?? "Untitled"}
                </div>
                {a.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">{a.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 font-mono text-[10px] text-muted">
                  <span className="truncate">
                    by {a.creator.displayName ?? a.creator.slug ?? ""}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="tabular-nums text-accent">${earned.toFixed(4)}</span>
                    {a.onchainSettledCount > 0 && (
                      <Badge variant="onchain" className="ml-1">{a.onchainSettledCount}</Badge>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
