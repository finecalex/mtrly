"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, FileText, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type EngagementResp =
  | {
      ok: true;
      kind: "mtrly";
      supported: true;
      contentId: number;
      title: string | null;
      totalParagraphs: number;
      totalViews: number;
      avgEngagementPct: number;
      dropoffParagraph: number | null;
      dropoffPct: number;
      perParagraph: Array<{ idx: number; viewers: number; pct: number }>;
    }
  | {
      ok: true;
      kind: "youtube" | "web";
      supported: false;
      reason: string;
    };

type ContentItem = {
  id: number;
  kind: string;
  title: string | null;
};

export function EngagementOverview({ contents }: { contents: ContentItem[] }) {
  const articles = useMemo(() => contents.filter((c) => c.kind === "mtrly"), [contents]);
  const [activeTab, setActiveTab] = useState<"article" | "video">("article");
  const [selectedId, setSelectedId] = useState<number | null>(articles[0]?.id ?? null);
  const [data, setData] = useState<EngagementResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (articles.length > 0 && selectedId == null) {
      setSelectedId(articles[0].id);
    }
  }, [articles, selectedId]);

  useEffect(() => {
    if (activeTab !== "article" || selectedId == null) return;
    setLoading(true);
    fetch(`/api/creator/content-engagement?contentId=${selectedId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeTab, selectedId]);

  if (articles.length === 0 && activeTab === "article") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedId={selectedId}
            onSelectId={setSelectedId}
            articles={articles}
          />
          <div className="mt-8 text-center text-sm text-muted">
            Publish an article on Mtrly to see engagement analytics here.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          articles={articles}
        />

        {activeTab === "video" ? (
          <ComingSoon />
        ) : loading ? (
          <LoadingState />
        ) : !data || !data.ok ? (
          <div className="mt-8 text-sm text-muted">No data yet.</div>
        ) : !data.supported ? (
          <ComingSoon />
        ) : data.totalViews === 0 ? (
          <EmptyState />
        ) : (
          <Body data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function Header({
  activeTab,
  onTabChange,
  selectedId,
  onSelectId,
  articles,
}: {
  activeTab: "article" | "video";
  onTabChange: (t: "article" | "video") => void;
  selectedId: number | null;
  onSelectId: (id: number) => void;
  articles: ContentItem[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md border border-accent/40 bg-accent/10 text-accent">
          <Sparkles size={14} />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">Engagement overview</h2>
      </div>
      <div className="flex items-center gap-2">
        {activeTab === "article" && articles.length > 0 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => onSelectId(Number(e.target.value))}
            className="h-9 max-w-[260px] rounded-lg border border-border bg-bg px-2.5 text-xs text-fg focus:border-fg focus:outline-none"
          >
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title ?? `Article #${a.id}`}
              </option>
            ))}
          </select>
        )}
        <div className="flex rounded-lg border border-border bg-bg p-0.5 text-xs">
          <button
            onClick={() => onTabChange("article")}
            className={[
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              activeTab === "article" ? "bg-accent/15 text-accent" : "text-muted hover:text-fg",
            ].join(" ")}
          >
            <FileText size={12} /> Article
          </button>
          <button
            onClick={() => onTabChange("video")}
            className={[
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              activeTab === "video" ? "bg-accent/15 text-accent" : "text-muted hover:text-fg",
            ].join(" ")}
          >
            <Play size={12} /> Video
          </button>
        </div>
      </div>
    </div>
  );
}

function Body({
  data,
}: {
  data: Extract<EngagementResp, { supported: true }>;
}) {
  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Engagement"
          value={`${data.avgEngagementPct}%`}
          sub="Avg. engaged"
          accent
        />
        <StatCard
          label="Dropoff point"
          value={data.dropoffParagraph != null ? `${data.dropoffPct}%` : "—"}
          sub={data.dropoffParagraph != null ? `of paragraph ${data.dropoffParagraph}` : "no dropoff yet"}
          accent
        />
        <StatCard
          label="Views"
          value={data.totalViews.toLocaleString()}
          sub="Total"
        />
      </div>

      <div className="mt-6 rounded-xl border border-border/60 bg-bg/40 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Engagement over content</h3>
          <div className="flex items-center gap-3 font-mono text-[10px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 bg-accent" /> Engagement
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 border-t border-dashed border-red-400" /> Dropoff point
            </span>
          </div>
        </div>
        <EngagementChart data={data} />
      </div>
    </>
  );
}

function EngagementChart({
  data,
}: {
  data: Extract<EngagementResp, { supported: true }>;
}) {
  const W = 720;
  const H = 220;
  const padL = 40;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const points = data.perParagraph;
  const n = Math.max(1, points.length - 1);

  const x = (idx: number) => padL + (idx / n) * innerW;
  const y = (pct: number) => padT + innerH - (pct / 100) * innerH;

  // Build a smooth-ish path via cubic Bézier between adjacent points so the
  // curve looks the way the mockup does without a charting dependency.
  const path = points.length > 0 ? buildSmoothPath(points.map((p) => [x(p.idx), y(p.pct)])) : "";

  const dropoffX = data.dropoffParagraph != null ? x(data.dropoffParagraph) : null;
  const dropoffY = data.dropoffParagraph != null ? y(data.dropoffPct) : null;

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Engagement over content chart">
        {/* Y gridlines + labels */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="fill-muted" fontSize={10} fontFamily="ui-monospace, monospace">
              {v}%
            </text>
          </g>
        ))}

        {/* Engagement line + area */}
        {points.length > 1 && (
          <>
            <path
              d={`${path} L ${x(points[points.length - 1].idx)} ${y(0)} L ${x(0)} ${y(0)} Z`}
              fill="rgba(124,255,124,0.08)"
            />
            <path d={path} stroke="#7cff7c" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Dropoff marker */}
        {dropoffX != null && dropoffY != null && (
          <g>
            <line
              x1={dropoffX}
              x2={dropoffX}
              y1={padT}
              y2={H - padB}
              stroke="rgba(248,113,113,0.7)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <circle cx={dropoffX} cy={dropoffY} r={5} fill="#0a0a0a" stroke="#f87171" strokeWidth={1.5} />
            <g transform={`translate(${Math.min(dropoffX + 14, W - padR - 110)}, ${Math.max(padT + 12, dropoffY - 24)})`}>
              <rect width={108} height={36} rx={6} fill="#0a0a0a" stroke="rgba(255,255,255,0.12)" />
              <text x={10} y={16} className="fill-accent" fontSize={11} fontFamily="ui-monospace, monospace">
                {data.dropoffPct}%
              </text>
              <text x={10} y={29} className="fill-muted" fontSize={9} fontFamily="ui-monospace, monospace">
                of paragraph {data.dropoffParagraph}
              </text>
            </g>
          </g>
        )}

        {/* X labels */}
        {axisTicks(points.length).map((t) => (
          <text
            key={t.idx}
            x={x(t.idx)}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted"
            fontSize={10}
            fontFamily="ui-monospace, monospace"
          >
            {t.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function axisTicks(total: number): Array<{ idx: number; label: string }> {
  if (total === 0) return [];
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => ({
      idx: i,
      label: i === 0 ? "Start" : i === total - 1 ? "End" : `P${i}`,
    }));
  }
  // Pick start, ~5 evenly spaced interior, end.
  const interior = [Math.round(total * 0.2), Math.round(total * 0.4), Math.round(total * 0.6), Math.round(total * 0.8)];
  const idxs = [0, ...interior, total - 1];
  return idxs.map((idx) => ({
    idx,
    label: idx === 0 ? "Start" : idx === total - 1 ? "End" : `P${idx}`,
  }));
}

function buildSmoothPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-bg/40 p-5">
      <div className="font-mono text-[10px] uppercase text-muted">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tabular-nums ${accent ? "text-accent" : "text-fg"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-5 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-border/60 bg-bg/40 p-8 text-center">
      <p className="text-sm text-muted">No reads yet. Once viewers tap their first paragraph, the curve appears here.</p>
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-accent/30 bg-accent/5 p-8 text-center">
      <Play size={20} className="mx-auto text-accent" />
      <h3 className="mt-3 text-base font-semibold">Video engagement — coming soon</h3>
      <p className="mt-1 text-sm text-muted">
        Per-second engagement and dropoff curves for YouTube and external video are next on the
        roadmap. Article analytics work today.
      </p>
    </div>
  );
}
