"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, ExternalLink, Quote } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type Tip = {
  id: number;
  amountUsdc: string;
  note: string | null;
  createdAt: string;
  explorerUrl: string | null;
  settledOnchain: boolean;
  onchainFromAddress: string | null;
  from: { id: number; slug: string | null; displayName: string | null; avatarUrl: string | null };
  to: { id: number; slug: string | null; displayName: string | null; avatarUrl: string | null };
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function TipsFeed({
  toSlug,
  withNote = true,
  limit = 6,
  variant = "page",
}: {
  toSlug?: string;
  withNote?: boolean;
  limit?: number;
  variant?: "page" | "panel";
}) {
  const [items, setItems] = useState<Tip[] | null>(null);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ limit: String(limit) });
    if (toSlug) params.set("toSlug", toSlug);
    if (withNote) params.set("withNote", "1");
    const fetchOnce = () =>
      fetch(`/api/tips/recent?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => alive && setItems(d.items ?? []))
        .catch(() => alive && setItems([]));
    fetchOnce();
    const t = setInterval(fetchOnce, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [toSlug, withNote, limit]);

  if (items === null) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface/40" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    if (variant === "panel") return null;
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        No tips with notes yet. Be the first to say something nice.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((t) => (
        <article
          key={t.id}
          className="rounded-xl border border-pink-400/20 bg-gradient-to-br from-pink-400/5 to-pink-500/5 p-4 transition-colors hover:border-pink-400/40"
        >
          <div className="flex items-center gap-2 text-xs">
            <Avatar
              size={26}
              name={t.from.displayName}
              email={null}
              seed={t.from.slug ?? String(t.from.id)}
              src={t.from.avatarUrl ?? undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {t.from.slug ? (
                  <Link href={`/c/${t.from.slug}`} className="truncate font-medium hover:underline">
                    {t.from.displayName ?? t.from.slug}
                  </Link>
                ) : (
                  <span className="truncate font-medium">{t.from.displayName ?? "anon"}</span>
                )}
                <span className="text-muted">tipped</span>
                {t.to.slug ? (
                  <Link href={`/c/${t.to.slug}`} className="truncate font-medium hover:underline">
                    {t.to.displayName ?? t.to.slug}
                  </Link>
                ) : (
                  <span className="truncate font-medium">{t.to.displayName ?? "creator"}</span>
                )}
              </div>
              <div className="font-mono text-[10px] text-muted">{timeAgo(t.createdAt)}</div>
            </div>
            <div className="flex items-center gap-1 font-mono text-sm tabular-nums text-pink-300">
              <Heart size={11} />${parseFloat(t.amountUsdc).toFixed(2)}
            </div>
          </div>

          {t.note && (
            <div className="mt-3 flex gap-2 rounded-lg border border-border/40 bg-bg/30 p-3">
              <Quote size={12} className="mt-0.5 shrink-0 text-pink-400/60" />
              <p className="text-sm leading-snug text-fg">{t.note}</p>
            </div>
          )}

          {t.explorerUrl && (
            <a
              href={t.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase text-muted hover:text-fg"
            >
              arcscan <ExternalLink size={10} />
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
