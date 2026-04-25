"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Users, FileText, Coins, ShieldCheck, ExternalLink, ArrowRight, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

type Stats = {
  ok: true;
  totals: {
    payments: number;
    volumeUsdc: string;
    ticks: number;
    ticksVolumeUsdc: string;
    tips: number;
    tipsVolumeUsdc: string;
    onchainSettled: number;
    creators: number;
    content: number;
    users: number;
    sessions: number;
    consumption: number;
  };
  last24h: { payments: number; volumeUsdc: string };
  gateway: null | {
    address: string;
    completed: number;
    completedTotalUsdc: string;
    available: string;
    explorerUrl: string;
  };
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchOnce = () =>
      fetch("/api/stats")
        .then((r) => r.json())
        .then((d) => alive && setStats(d))
        .catch(() => undefined);
    fetchOnce();
    const t = setInterval(fetchOnce, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted">
          <Activity size={14} /> Live network stats
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Mtrly is moving <span className="text-accent">USDC</span> by the second.
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Aggregate, real-time view of every paid second on the platform. Polls every 10 seconds.
          All onchain numbers verifiable on{" "}
          <a
            href="https://testnet.arcscan.app/address/0x518dBC8D650666889575178E8f0bDDcDd68063B1"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            arcscan
          </a>
          .
        </p>
      </header>

      {!stats ? (
        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
            <BigStat
              icon={<Coins size={16} />}
              label="Total volume settled"
              value={`$${parseFloat(stats.totals.volumeUsdc).toFixed(4)}`}
              sub={`${stats.totals.payments} payments lifetime`}
              accent
            />
            <BigStat
              icon={<ShieldCheck size={16} />}
              label="Onchain settled"
              value={stats.totals.onchainSettled.toString()}
              sub={`Verifiable on Arc Testnet`}
              green
            />
            <BigStat
              icon={<Activity size={16} />}
              label="Last 24h"
              value={`$${parseFloat(stats.last24h.volumeUsdc).toFixed(4)}`}
              sub={`${stats.last24h.payments} payments today`}
            />
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SmallStat icon={<Users size={14} />} label="Creators" value={stats.totals.creators.toString()} />
            <SmallStat icon={<FileText size={14} />} label="Content items" value={stats.totals.content.toString()} />
            <SmallStat icon={<Hash size={14} />} label="View sessions" value={stats.totals.sessions.toString()} />
            <SmallStat icon={<Users size={14} />} label="Total users" value={stats.totals.users.toString()} />
          </section>

          <section className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="bg-creator-card">
              <CardContent className="p-5">
                <div className="font-mono text-[10px] uppercase text-muted">Per-second metering (ticks)</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums text-accent">
                  ${parseFloat(stats.totals.ticksVolumeUsdc).toFixed(4)}
                </div>
                <div className="mt-1 font-mono text-xs text-muted">
                  {stats.totals.ticks} ticks · text $0.005/¶ · video $0.05/min
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="font-mono text-[10px] uppercase text-muted">One-time tips</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  ${parseFloat(stats.totals.tipsVolumeUsdc).toFixed(4)}
                </div>
                <div className="mt-1 font-mono text-xs text-muted">
                  {stats.totals.tips} tips · same Postgres + onchain settle path as ticks
                </div>
              </CardContent>
            </Card>
          </section>

          {stats.gateway && (
            <section className="mt-8 rounded-2xl border border-green-400/30 bg-green-400/5 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-green-400">
                    <ShieldCheck size={12} /> Onchain settlement layer · Circle Gateway
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">
                    {stats.gateway.completed} batched transfers · ${stats.gateway.completedTotalUsdc} settled
                  </div>
                  <div className="mt-1 break-all font-mono text-[10px] text-muted">
                    {stats.gateway.address}
                  </div>
                </div>
                <a
                  href={stats.gateway.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-green-400/50 px-4 py-2 font-mono text-[10px] uppercase text-green-400 hover:bg-green-400/10"
                >
                  Verify on arcscan <ExternalLink size={11} />
                </a>
              </div>
            </section>
          )}

          <section className="mt-10 flex flex-wrap gap-2">
            <Link
              href="/explore"
              className="flex items-center gap-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:border-fg"
            >
              Browse content <ArrowRight size={12} />
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center gap-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:border-fg"
            >
              Leaderboard <ArrowRight size={12} />
            </Link>
            <Link
              href="/auth/signup"
              className="flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
            >
              Sign up to play
            </Link>
          </section>
        </>
      )}
    </main>
  );
}

function BigStat({
  icon, label, value, sub, accent, green,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean; green?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted">
          {icon} {label}
        </div>
        <div className={`mt-2 text-3xl font-semibold tabular-nums ${accent ? "text-accent" : ""} ${green ? "text-green-400" : ""}`}>
          {value}
        </div>
        {sub && <div className="mt-1 font-mono text-xs text-muted">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SmallStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted">
        {icon} {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
