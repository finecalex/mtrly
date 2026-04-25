"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ShieldCheck, Hourglass, Zap } from "lucide-react";

type Activity = {
  totalOnchainTicks: number;
  totalConfirmed: number;
  totalVolumeUsdc: string;
  items: Array<{
    id: number;
    amountUsdc: string;
    createdAt: string;
    onchainTxHash: string | null;
    settledOnchain: boolean;
    explorerUrl: string | null;
    content: { title: string | null; normalizedUrl: string; kind: string } | null;
  }>;
};

function fmtAmount(v: string): string {
  const n = Number(v);
  if (Number.isNaN(n)) return "0";
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function shortHash(h: string | null): string {
  if (!h) return "";
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

export function LiveTicker() {
  const [data, setData] = useState<Activity | null>(null);
  const [latestId, setLatestId] = useState<number | null>(null);
  const [pulseId, setPulseId] = useState<number | null>(null);
  const prevTopId = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch("/api/activity")
        .then((r) => r.json())
        .then((j) => mounted && setData(j))
        .catch(() => null);
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!data || data.items.length === 0) return;
    const top = data.items[0].id;
    if (prevTopId.current != null && top !== prevTopId.current) {
      setPulseId(top);
      setLatestId(top);
      const t = setTimeout(() => setPulseId(null), 1400);
      return () => clearTimeout(t);
    }
    prevTopId.current = top;
    if (latestId == null) setLatestId(top);
  }, [data, latestId]);

  if (!data) {
    return (
      <div className="font-mono text-xs text-muted">Loading live activity…</div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Onchain ticks" value={data.totalOnchainTicks.toString()} />
        <Stat label="Confirmed" value={data.totalConfirmed.toString()} />
        <Stat label="Volume" value={`$${fmtAmount(data.totalVolumeUsdc)}`} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          live · {data.items.length} most recent
        </div>
        <span className="font-mono text-[10px] text-muted">scroll for more ↓</span>
      </div>

      <ul
        className="mt-2 max-h-[420px] space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-surface/30 p-2 font-mono text-xs"
        role="list"
      >
        {data.items.length === 0 ? (
          <li className="px-2 py-3 text-muted">No onchain activity yet.</li>
        ) : (
          data.items.map((p) => {
            const isPulse = pulseId === p.id;
            return (
              <li
                key={p.id}
                className={[
                  "group flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors",
                  isPulse
                    ? "animate-tick-flash bg-accent/15"
                    : "border-b border-border/40 last:border-b-0 hover:bg-bg/40",
                ].join(" ")}
              >
                <span className="flex items-center gap-2 shrink-0 text-muted">
                  {isPulse ? (
                    <Zap size={11} className="text-accent" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted/40" />
                  )}
                  {timeAgo(p.createdAt)}
                </span>
                <span className="min-w-0 flex-1 truncate text-fg/90">
                  {p.content?.title ?? p.content?.normalizedUrl ?? "—"}
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-fg tabular-nums">${fmtAmount(p.amountUsdc)}</span>
                  {p.explorerUrl ? (
                    <a
                      href={p.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md border border-green-400/30 bg-green-400/5 px-1.5 py-0.5 text-[10px] text-green-400 hover:bg-green-400/10"
                      title={p.onchainTxHash ?? ""}
                    >
                      <ShieldCheck size={10} />
                      <span className="font-mono">{shortHash(p.onchainTxHash)}</span>
                      <ExternalLink size={9} />
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <Hourglass size={10} /> batching
                    </span>
                  )}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="font-mono text-xs uppercase text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
