"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Youtube, FileText, Sparkles, TrendingUp, Clock, Search, X, BookOpen } from "lucide-react";
import { ContentCard, ContentCardItem } from "@/components/ContentCard";
import { cn } from "@/lib/cn";

type ExploreItem = ContentCardItem & {
  normalizedUrl: string | null;
  createdAt: string;
  paymentCount: number;
  sessionCount: number;
  creator: {
    id: number;
    slug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    ownedEoaAddress: string | null;
  };
};

type Sort = "recent" | "trending" | "earnings";
type KindFilter = "all" | "youtube" | "web" | "mtrly";

export default function ExplorePage() {
  const [sort, setSort] = useState<Sort>("recent");
  const [kind, setKind] = useState<KindFilter>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAuthed(!!d.user))
      .catch(() => setIsAuthed(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, kind, limit: "24" });
    if (debouncedQ) params.set("q", debouncedQ);
    fetch(`/api/explore?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setHasMore(!!data.hasMore);
      })
      .finally(() => setLoading(false));
  }, [sort, kind, debouncedQ]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ sort, kind, limit: "24", offset: items.length.toString() });
    if (debouncedQ) params.set("q", debouncedQ);
    try {
      const data = await fetch(`/api/explore?${params.toString()}`).then((r) => r.json());
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setHasMore(!!data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

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
          wallet — settled onchain on Arc Testnet via Circle Gateway. No subscriptions, no tipping
          buttons.
        </p>
        {!isAuthed && (
          <p className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-muted">
            Previews are blurred until you{" "}
            <Link href="/auth/signup" className="font-medium text-accent hover:underline">
              sign up
            </Link>
            . Watching always pays the creator — the URL stays hidden so the meter can't be skipped.
          </p>
        )}
      </header>

      <div className="mt-8">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 80))}
            placeholder="Search by title, description, creator…"
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-9 py-2.5 text-sm placeholder:text-muted focus:border-fg focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-bg hover:text-fg"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 text-sm">
          <FilterTab active={kind === "all"} onClick={() => setKind("all")}>
            All
          </FilterTab>
          <FilterTab active={kind === "mtrly"} onClick={() => setKind("mtrly")}>
            <BookOpen size={14} /> Articles
          </FilterTab>
          <FilterTab active={kind === "youtube"} onClick={() => setKind("youtube")}>
            <Youtube size={14} /> YouTube
          </FilterTab>
          <FilterTab active={kind === "web"} onClick={() => setKind("web")}>
            <FileText size={14} /> External
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
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} isAuthed={isAuthed} />
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="font-mono text-[10px] uppercase text-muted">
              Showing {items.length} of {total}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-border bg-surface px-5 py-2 text-sm hover:border-fg disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </>
      )}
    </main>
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
        <div key={i} className="h-72 animate-pulse rounded-xl border border-border bg-surface/50" />
      ))}
    </div>
  );
}
