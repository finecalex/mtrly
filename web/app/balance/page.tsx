"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = {
  id: number;
  email: string;
  displayName: string | null;
  role: "viewer" | "creator";
  walletAddress: string | null;
  balance: string;
};

type TxItem = {
  id: number;
  type: string;
  amount: string;
  createdAt: string;
  reference: string | null;
};

type GatewayStatus = {
  ok: boolean;
  address?: string;
  chain?: string;
  gateway?: { availableFormatted: string; totalFormatted: string };
  wallet?: { balanceFormatted: string };
  transfers?: Array<{
    id: string;
    amount: string;
    status: string;
    fromAddress: string;
    toAddress: string;
    createdAt: string;
    explorerUrl?: string;
  }>;
  counts?: Record<string, number>;
  completedStats?: {
    count: number;
    totalUsdc: string;
    latestAt: string | null;
    platformAddress: string;
    platformExplorerUrl: string;
  };
  error?: string;
};

export default function BalancePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [gw, setGw] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function refresh() {
    const [meRes, balRes, gwRes] = await Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/balance/status").then((r) => r.json()).catch(() => null),
      fetch("/api/gateway/status").then((r) => r.json()).catch(() => null),
    ]);
    setMe(meRes.user);
    if (balRes && !balRes.error) setTxs(balRes.transactions ?? []);
    setGw(gwRes);
    setLoading(false);
  }

  async function syncFromWallet() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/balance/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(data.error ?? "sync_failed");
      } else if (Number(data.credited) > 0) {
        setSyncMsg(`Credited $${Number(data.credited).toFixed(4)} from onchain wallet.`);
      } else {
        setSyncMsg(`Already up to date. Onchain: $${Number(data.onchainUsdc).toFixed(4)}.`);
      }
      await refresh();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "sync_failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <Shell><p className="text-muted">Loading…</p></Shell>;

  if (!me) {
    return (
      <Shell>
        <p className="text-muted">You're not logged in.</p>
        <div className="mt-4 flex gap-3">
          <Link href="/auth/login" className="rounded border border-accent bg-accent px-4 py-2 font-mono text-sm text-bg">Log in</Link>
          <Link href="/auth/signup" className="rounded border border-border px-4 py-2 font-mono text-sm">Sign up</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="font-mono text-xs uppercase text-muted">Balance</div>
          <div className="mt-1 text-5xl font-semibold">${Number(me.balance).toFixed(4)}</div>
          <div className="mt-1 text-xs text-muted">USDC on Arc Testnet · updates after deposits</div>
        </div>
        <button
          onClick={() => refresh()}
          className="rounded border border-border px-3 py-2 font-mono text-xs hover:border-fg"
        >
          Refresh
        </button>
      </div>

      <section className="mt-10 rounded border border-border bg-surface p-5">
        <div className="font-mono text-xs uppercase text-muted">Deposit address</div>
        <div className="mt-2 break-all font-mono text-sm">
          {me.walletAddress ?? "— wallet provisioning pending —"}
        </div>
        <p className="mt-3 text-xs text-muted">
          Send USDC on Arc Testnet to this address (get test USDC from{" "}
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="underline">
            faucet.circle.com
          </a>), then click <b>Sync from wallet</b> to credit the delta to your Mtrly balance.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={syncFromWallet}
            disabled={syncing || !me.walletAddress}
            className="rounded border border-accent bg-accent px-4 py-2 font-mono text-xs text-bg hover:opacity-90 disabled:opacity-40"
          >
            {syncing ? "Syncing…" : "Sync from wallet"}
          </button>
          {syncMsg && <span className="font-mono text-xs text-muted">{syncMsg}</span>}
        </div>
      </section>

      <section className="mt-8">
        <div className="font-mono text-xs uppercase text-muted">Recent transactions</div>
        {txs.length === 0 ? (
          <div className="mt-3 rounded border border-dashed border-border p-6 text-center text-sm text-muted">
            No activity yet.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded border border-border">
            {txs.map((t) => (
              <li key={t.id} className="flex justify-between px-4 py-2 font-mono text-xs">
                <span className="text-muted">{t.type}</span>
                <span>{Number(t.amount) >= 0 ? "+" : ""}{t.amount} USDC</span>
                <span className="text-muted">{new Date(t.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-xs uppercase text-muted">Platform settlement layer · Circle Gateway</div>
            <p className="mt-1 max-w-xl text-xs text-muted">
              This is the <b>platform demo-buyer EOA</b>, not your wallet. Each viewer tick is batched through this
              address onto Arc Testnet via Circle Gateway. Transfers below are server-side settlements — not
              charges to your account.
            </p>
          </div>
          <div className="font-mono text-[10px] text-muted">{gw?.chain ?? "—"}</div>
        </div>
        {!gw?.ok ? (
          <p className="mt-3 text-sm text-muted">
            Gateway not configured on this deploy (awaiting `MTRLY_DEMO_BUYER_KEY` + testnet funding).
          </p>
        ) : (
          <GatewayPanel gw={gw} />
        )}
      </section>

      <div className="mt-10 flex gap-3 border-t border-border pt-6">
        <form action="/api/auth/logout" method="POST">
          <button className="rounded border border-border px-3 py-2 font-mono text-xs hover:border-fg">Log out</button>
        </form>
        {me.role === "creator" && (
          <Link href="/dashboard" className="rounded border border-border px-3 py-2 font-mono text-xs hover:border-fg">
            Creator dashboard →
          </Link>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-8 py-12">
      <div className="font-mono text-xs uppercase text-muted">mtrly / balance</div>
      <div className="mt-6">{children}</div>
    </main>
  );
}

function StatCell({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
  return (
    <div>
      <div className={`font-mono text-lg tabular-nums ${color}`}>{value}</div>
      <div className="font-mono text-[9px] uppercase text-muted">{label}</div>
      <div className="font-mono text-[9px] text-muted opacity-70">{hint}</div>
    </div>
  );
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  received: { text: "queued", color: "text-muted" },
  batched: { text: "batched", color: "text-yellow-300" },
  confirmed: { text: "confirmed", color: "text-accent" },
  completed: { text: "completed", color: "text-green-400" },
  failed: { text: "failed", color: "text-red-400" },
};

function GatewayPanel({ gw }: { gw: GatewayStatus }) {
  const [showFailed, setShowFailed] = useState(false);
  const all = gw.transfers ?? [];
  const live = all.filter((t) => t.status !== "failed");
  const failed = all.filter((t) => t.status === "failed");
  const visible = showFailed ? all : live;
  const counts = gw.counts ?? {};

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-mono text-[10px] uppercase text-muted">Gateway balance</div>
          <div className="mt-1 font-mono text-xl">${gw.gateway?.availableFormatted ?? "0"}</div>
          <div className="font-mono text-[10px] text-muted">available · gasless</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-muted">EOA wallet</div>
          <div className="mt-1 font-mono text-xl">${gw.wallet?.balanceFormatted ?? "0"}</div>
          <div className="break-all font-mono text-[10px] text-muted">{gw.address}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 rounded border border-border bg-bg p-2 text-center">
        <StatCell label="received" value={counts.received ?? 0} color="text-muted" hint="queued for next batch" />
        <StatCell label="batched" value={counts.batched ?? 0} color="text-yellow-300" hint="bundled, awaiting Arc" />
        <StatCell label="confirmed" value={counts.confirmed ?? 0} color="text-accent" hint="onchain hash set" />
        <StatCell label="completed" value={counts.completed ?? 0} color="text-green-400" hint="finalized" />
        <StatCell label="failed" value={counts.failed ?? 0} color="text-red-400" hint="testnet bundler err" />
      </div>
      {gw.completedStats && gw.completedStats.count > 0 && (
        <div className="mt-3 rounded border border-green-400/30 bg-green-400/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase text-green-400">Onchain settlement proof</div>
              <div className="mt-1 font-mono text-sm">
                <span className="text-green-400 tabular-nums">{gw.completedStats.count}</span>{" "}
                <span className="text-muted">nanopayments settled · </span>
                <span className="tabular-nums">${gw.completedStats.totalUsdc}</span>{" "}
                <span className="text-muted">USDC finalized on Arc</span>
              </div>
              {gw.completedStats.latestAt && (
                <div className="mt-1 font-mono text-[10px] text-muted">
                  latest: {new Date(gw.completedStats.latestAt).toLocaleString()}
                </div>
              )}
            </div>
            <a
              href={gw.completedStats.platformExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded border border-green-400/50 px-3 py-1.5 font-mono text-[10px] uppercase text-green-400 hover:bg-green-400/10"
            >
              View on arcscan ↗
            </a>
          </div>
        </div>
      )}
      <p className="mt-2 font-mono text-[10px] text-muted">
        Circle testnet batcher runs ~every 2h at the top of the hour (e.g. 19:00, 21:00, 23:00 UTC).
        Transfers move <span className="text-muted">received</span> → <span className="text-yellow-300">batched</span> →
        <span className="text-accent"> confirmed</span> in ~4-6h total on testnet.
      </p>
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase text-muted">
            Recent Gateway transfers {failed.length > 0 && <span className="text-red-400">· {failed.length} failed</span>}
          </div>
          {failed.length > 0 && (
            <button
              onClick={() => setShowFailed((v) => !v)}
              className="font-mono text-[10px] uppercase text-muted underline hover:text-fg"
            >
              {showFailed ? "hide failed" : `show ${failed.length} failed`}
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <div className="mt-2 rounded border border-dashed border-border p-3 text-center text-xs text-muted">
            No Gateway transfers yet.
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded border border-border">
            {visible.map((t) => {
              const label = STATUS_LABEL[t.status] ?? { text: t.status, color: "text-muted" };
              return (
                <li key={t.id} className="px-3 py-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className={label.color}>{label.text}</span>
                    <span className="tabular-nums">${Number(t.amount).toFixed(6)}</span>
                    <span className="text-muted">{new Date(t.createdAt).toLocaleString()}</span>
                    {t.explorerUrl ? (
                      <a href={t.explorerUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                        arcscan ↗
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {failed.length > 0 && showFailed && (
          <p className="mt-2 font-mono text-[10px] text-muted">
            "failed" here means Circle Gateway's testnet batch-bundler returned an error — funds were
            automatically returned to the Gateway available balance, no USDC was lost. Often transient
            on testnet.
          </p>
        )}
      </div>
    </>
  );
}
