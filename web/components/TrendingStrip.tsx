"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Youtube, FileText, BookOpen, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { hashGradient } from "@/lib/gradients";

type Item = {
  id: number;
  kind: "youtube" | "web" | "mtrly";
  title: string | null;
  description: string | null;
  previewImageUrl: string | null;
  windowVolumeUsdc: string;
  windowPaymentCount: number;
  creator: { id: number; slug: string | null; displayName: string | null; avatarUrl: string | null };
};

export function TrendingStrip() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchOnce = () =>
      fetch("/api/trending?windowMin=60&limit=4")
        .then((r) => r.json())
        .then((d) => alive && setItems(d.items ?? []))
        .catch(() => alive && setItems([]));
    fetchOnce();
    const t = setInterval(fetchOnce, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (items === null) {
    return (
      <section className="border-t border-border pt-12">
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted">
          <Flame size={14} /> Trending now
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface/50" />
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
          <Flame size={14} /> Trending now <span className="text-muted/60">· last 60 min</span>
        </div>
        <Link
          href="/explore?sort=trending"
          className="flex items-center gap-1 font-mono text-xs uppercase text-muted hover:text-fg"
        >
          all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((it) => {
          const KindIcon = it.kind === "youtube" ? Youtube : it.kind === "mtrly" ? BookOpen : FileText;
          const grad = hashGradient(`${it.kind}-${it.id}-${it.title ?? ""}`);
          const internal = it.kind === "mtrly";
          const href = internal ? `/a/${it.id}` : "/auth/signup";
          const target = internal ? undefined : "_self";
          const inner = (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-3 transition-colors hover:border-pink-400/40 hover:bg-pink-400/5">
              <div
                className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                style={{ background: grad }}
              >
                {it.previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.previewImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <KindIcon size={20} className="text-white/70" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-semibold leading-snug">
                  {it.title ?? "Untitled"}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted">
                  <Avatar
                    size={14}
                    name={it.creator.displayName}
                    email={null}
                    seed={it.creator.slug ?? String(it.creator.id)}
                    src={it.creator.avatarUrl ?? undefined}
                  />
                  <span className="truncate">{it.creator.displayName ?? it.creator.slug ?? ""}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm tabular-nums text-pink-400">
                  ${parseFloat(it.windowVolumeUsdc).toFixed(4)}
                </div>
                <Badge variant="warn" className="mt-1">
                  {it.windowPaymentCount} ticks/h
                </Badge>
              </div>
            </div>
          );
          return (
            <Link key={it.id} href={href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
