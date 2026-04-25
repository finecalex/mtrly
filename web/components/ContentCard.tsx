"use client";

import Link from "next/link";
import { Youtube, FileText, ExternalLink, Lock, Play, TrendingUp, BookOpen, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { hashGradient } from "@/lib/gradients";

export type ContentCardItem = {
  id: number;
  kind: "youtube" | "web" | "mtrly";
  title: string | null;
  description: string | null;
  previewImageUrl: string | null;
  rawUrl: string | null;
  lifetimeEarnedUsdc?: string;
  paymentCount?: number;
  onchainSettledCount?: number;
  trending7dUsdc?: string;
  viewerCount?: number;
  creator?: {
    id: number;
    slug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

function isInternalArticle(item: ContentCardItem): boolean {
  return item.kind === "mtrly";
}

function tuneInHrefFor(item: ContentCardItem): { href: string; external: boolean } | null {
  if (isInternalArticle(item)) return { href: `/a/${item.id}`, external: false };
  if (item.rawUrl) return { href: item.rawUrl, external: true };
  return null;
}

function kindIconFor(kind: ContentCardItem["kind"]) {
  if (kind === "youtube") return Youtube;
  if (kind === "mtrly") return BookOpen;
  return FileText;
}

export function ContentCard({
  item,
  showCreator = true,
  isAuthed,
}: {
  item: ContentCardItem;
  showCreator?: boolean;
  isAuthed: boolean;
}) {
  const earned = item.lifetimeEarnedUsdc != null ? parseFloat(item.lifetimeEarnedUsdc) : null;
  const trending = item.trending7dUsdc != null ? parseFloat(item.trending7dUsdc) : 0;
  // Internal articles can be opened by anyone (the article page itself paywalls
  // beyond the first paragraph). External URLs stay locked behind auth so visitors
  // can't bypass the meter by going to YouTube directly.
  const canTuneIn = isInternalArticle(item) ? true : isAuthed && !!item.rawUrl;
  const target = tuneInHrefFor(item);
  const wholeCardLink: { href: string; external: boolean } | null = canTuneIn
    ? target
    : { href: "/auth/signup", external: false };

  return (
    <Card className="group relative flex flex-col overflow-hidden bg-creator-card transition-all hover:border-accent/40 hover:shadow-[0_0_0_1px_rgba(124,255,124,0.15)]">
      {/* Whole-card click target — sits beneath badges/links so they stay interactive */}
      {wholeCardLink && (
        wholeCardLink.external ? (
          <a
            href={wholeCardLink.href}
            target="_blank"
            rel="noreferrer"
            aria-label={item.title ?? "Open content"}
            className="absolute inset-0 z-10"
          />
        ) : (
          <Link
            href={wholeCardLink.href}
            aria-label={item.title ?? "Open content"}
            className="absolute inset-0 z-10"
          />
        )
      )}

      {/* Preview */}
      <PreviewSurface item={item} canTuneIn={canTuneIn} />

      {/* Body */}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {showCreator && item.creator && (
          <div className="relative z-20">
            <CreatorRow creator={item.creator} />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug">
            {item.title ?? <span className="text-muted">Untitled content</span>}
          </div>
          {item.description ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted">{item.description}</p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <InlineMeta item={item} canTuneIn={canTuneIn} />
          {trending > 0 && (
            <Badge variant="warn">
              <TrendingUp size={10} /> ${trending.toFixed(4)}/7d
            </Badge>
          )}
        </div>

        {(earned != null || item.onchainSettledCount != null) && (
          <div className="-mx-1 grid grid-cols-3 gap-1 rounded-lg border border-border/50 bg-bg/50 p-1.5 text-center">
            {item.viewerCount != null && (
              <Stat label="viewers" value={item.viewerCount.toString()} />
            )}
            {earned != null && <Stat label="earned" value={`$${earned.toFixed(4)}`} accent />}
            {item.onchainSettledCount != null && (
              <Stat label="onchain" value={item.onchainSettledCount.toString()} green />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewSurface({ item, canTuneIn }: { item: ContentCardItem; canTuneIn: boolean }) {
  const KindIcon = kindIconFor(item.kind);
  const seed = `${item.kind}-${item.id}-${item.title ?? ""}`;
  const gradient = hashGradient(seed);

  return (
    <div className="relative aspect-video w-full overflow-hidden border-b border-border/60">
      {item.previewImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.previewImageUrl}
          alt={item.title ?? "preview"}
          className={cn(
            "h-full w-full object-cover transition-all duration-500",
            !canTuneIn && "scale-110 blur-lg saturate-50",
            canTuneIn && "group-hover:scale-105",
          )}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center transition-transform duration-500",
            !canTuneIn && "scale-105 blur-sm saturate-75",
            canTuneIn && "group-hover:scale-105",
          )}
          style={{ background: gradient }}
        >
          <KindIcon size={48} className="text-white/55" strokeWidth={1.4} />
        </div>
      )}

      {/* Top-left kind badge */}
      <div className="absolute left-2 top-2 z-20">
        <Badge variant="kind">
          <KindIcon size={10} />
          {item.kind}
        </Badge>
      </div>

      {/* Hover affordance — the whole card is the link, this is just visual feedback. */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-bg/60 via-transparent to-transparent p-3">
        {canTuneIn ? (
          <div className="translate-y-1 rounded-full bg-accent/95 p-2.5 text-bg opacity-0 shadow-[0_0_24px_rgba(124,255,124,0.55)] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {item.kind === "mtrly" ? (
              <BookOpen size={16} />
            ) : item.kind === "youtube" ? (
              <Play size={16} fill="currentColor" />
            ) : (
              <ArrowUpRight size={16} />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-bg/85 px-2.5 py-1 text-fg backdrop-blur-md">
            <Lock size={11} />
            <span className="font-mono text-[10px] uppercase tracking-wide">Sign up</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatorRow({ creator }: { creator: NonNullable<ContentCardItem["creator"]> }) {
  const slug = creator.slug;
  const inner = (
    <div className="flex items-center gap-2 text-xs">
      <Avatar
        size={22}
        name={creator.displayName}
        email={null}
        seed={slug ?? String(creator.id)}
        src={creator.avatarUrl ?? undefined}
      />
      <span className="truncate font-medium">{creator.displayName ?? slug ?? ""}</span>
      {slug && <span className="font-mono text-[10px] text-muted">/c/{slug}</span>}
    </div>
  );
  return slug ? (
    <Link href={`/c/${slug}`} className="-mx-1 inline-flex rounded-md px-1 py-0.5 hover:bg-bg/50">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function InlineMeta({ item, canTuneIn }: { item: ContentCardItem; canTuneIn: boolean }) {
  if (!canTuneIn) {
    return (
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-muted">
        <Lock size={10} /> sign up to access
      </span>
    );
  }
  const label = item.kind === "mtrly"
    ? "$0.005 / paragraph"
    : item.kind === "youtube"
      ? "$0.005 / second"
      : "metered read";
  const Icon = item.kind === "mtrly" ? BookOpen : item.kind === "youtube" ? Play : ExternalLink;
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-accent">
      <Icon size={10} fill={item.kind === "youtube" ? "currentColor" : undefined} />
      {label}
    </span>
  );
}

function Stat({ label, value, accent, green }: { label: string; value: string; accent?: boolean; green?: boolean }) {
  return (
    <div className="px-1">
      <div
        className={cn(
          "font-mono text-xs tabular-nums",
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
