"use client";

import { useEffect, useState } from "react";

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

export function LiveTicker() {
  const [data, setData] = useState<Activity | null>(null);

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

      <ul className="mt-6 space-y-1 font-mono text-xs">
        {data.items.length === 0 ? (
          <li className="text-muted">No onchain activity yet.</li>
        ) : (
          data.items.slice(0, 10).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border py-2">
              <span className="text-muted shrink-0">{timeAgo(p.createdAt)}</span>
              <span className="truncate">
                {p.content?.title ?? p.content?.normalizedUrl ?? "—"}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-fg">${fmtAmount(p.amountUsdc)}</span>
                {p.explorerUrl ? (
                  <a
                    href={p.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                    title={p.onchainTxHash ?? ""}
                  >
                    onchain ↗
                  </a>
                ) : (
                  <span className="text-muted">batching…</span>
                )}
              </span>
            </li>
          ))
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
