"use client";

import Link from "next/link";
import { Youtube, FileText, ExternalLink, Lock, Play, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

export type ContentCardItem = {
  id: number;
  kind: "youtube" | "web";
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
  const slug = item.creator?.slug;
  const canTuneIn = isAuthed && !!item.rawUrl;

  return (
    <Card className="group flex flex-col overflow-hidden bg-creator-card transition-all hover:border-accent/40">
      {/* Preview */}
      <PreviewSurface item={item} canTuneIn={canTuneIn} />

      {/* Body */}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {showCreator && item.creator && (
          <CreatorRow creator={item.creator} />
        )}

        <div className="space-y-1.5">
          <div className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug">
            {item.title ?? <span className="text-muted">Untitled content</span>}
          </div>
          {item.description ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted">{item.description}</p>
          ) : (
            <p className="text-xs italic text-muted/60">No description.</p>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <CTA canTuneIn={canTuneIn} rawUrl={item.rawUrl} />
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
  const KindIcon = item.kind === "youtube" ? Youtube : FileText;
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
            "flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 via-surface to-bg",
            !canTuneIn && "blur-md",
          )}
        >
          <KindIcon size={42} className="text-muted/50" />
        </div>
      )}

      {/* Top-left kind badge */}
      <div className="absolute left-2 top-2">
        <Badge variant="kind">
          <KindIcon size={10} />
          {item.kind}
        </Badge>
      </div>

      {/* Center overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-bg/70 via-bg/20 to-transparent">
        {canTuneIn ? (
          <div className="flex flex-col items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-accent p-3 text-bg shadow-[0_0_24px_rgba(124,255,124,0.5)]">
              <Play size={18} fill="currentColor" />
            </div>
            <span className="font-mono text-[10px] uppercase text-fg">Tune in</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 rounded-full border border-border/80 bg-bg/80 px-4 py-2 text-fg backdrop-blur-md">
            <Lock size={14} />
            <span className="font-mono text-[10px] uppercase tracking-wide">Sign up to watch</span>
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
      <span className="truncate font-medium">{creator.displayName ?? slug ?? "—"}</span>
      {slug && <span className="font-mono text-[10px] text-muted">/c/{slug}</span>}
    </div>
  );
  return slug ? (
    <Link href={`/c/${slug}`} className="-mx-1 rounded-md px-1 py-0.5 hover:bg-bg/50">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function CTA({ canTuneIn, rawUrl }: { canTuneIn: boolean; rawUrl: string | null }) {
  if (canTuneIn && rawUrl) {
    return (
      <a
        href={rawUrl}
        target="_blank"
        rel="noreferrer"
        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[11px] uppercase text-accent hover:bg-accent/20"
      >
        <Play size={11} fill="currentColor" /> Tune in
        <ExternalLink size={10} />
      </a>
    );
  }
  return (
    <Link
      href="/auth/signup"
      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase hover:border-fg"
    >
      <Lock size={11} /> Sign up to watch
    </Link>
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
