"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Heart, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type Series = {
  date: string;
  tickUsdc: string;
  tipUsdc: string;
  totalUsdc: string;
  payments: number;
  onchainSettled: number;
};

type Resp = {
  ok: true;
  days: number;
  totals: { payments: number; onchainSettled: number; tickUsdc: string; tipUsdc: string };
  series: Series[];
};

export function IncomeChart() {
  const [data, setData] = useState<Resp | null>(null);
  const [days, setDays] = useState<7 | 30>(30);

  useEffect(() => {
    setData(null);
    fetch(`/api/creator/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, [days]);

  if (!data) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const series = data.series;
  const max = Math.max(0.001, ...series.map((s) => parseFloat(s.totalUsdc)));
  const totalIncome = series.reduce((a, s) => a + parseFloat(s.totalUsdc), 0);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] uppercase text-muted">Income last {days} days</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-accent">
              ${totalIncome.toFixed(4)}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
              <span>
                <span className="text-fg tabular-nums">{data.totals.payments}</span> payments
              </span>
              <span>
                <span className="text-green-400 tabular-nums">{data.totals.onchainSettled}</span> onchain
              </span>
              <span>
                <span className="text-pink-400 tabular-nums">${parseFloat(data.totals.tipUsdc).toFixed(4)}</span> tips
              </span>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-bg p-1 text-xs">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  days === d ? "bg-surface text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex h-32 items-end gap-1">
          {series.map((s) => {
            const tick = parseFloat(s.tickUsdc);
            const tip = parseFloat(s.tipUsdc);
            const total = tick + tip;
            const heightPct = max > 0 ? (total / max) * 100 : 0;
            const tipPct = total > 0 ? (tip / total) * 100 : 0;
            return (
              <div
                key={s.date}
                className="group relative flex h-full flex-1 items-end"
                title={`${s.date} · $${total.toFixed(4)} (${s.payments} payments)`}
              >
                <div
                  className="relative w-full overflow-hidden rounded-t bg-accent/40 transition-colors group-hover:bg-accent/70"
                  style={{ height: `${heightPct}%`, minHeight: total > 0 ? 2 : 0 }}
                >
                  {tip > 0 && (
                    <div
                      className="absolute inset-x-0 top-0 bg-pink-400/70"
                      style={{ height: `${tipPct}%` }}
                    />
                  )}
                </div>
                {total > 0 && (
                  <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[9px] text-fg shadow-sm group-hover:block">
                    ${total.toFixed(4)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[9px] text-muted">
          <span>{series[0]?.date.slice(5)}</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-accent/40" /> ticks</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-pink-400/70" /> tips</span>
          </span>
          <span>{series[series.length - 1]?.date.slice(5)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
