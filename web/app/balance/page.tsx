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

export default function BalancePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [meRes, balRes] = await Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/balance/status").then((r) => r.json()).catch(() => null),
    ]);
    setMe(meRes.user);
    if (balRes && !balRes.error) setTxs(balRes.transactions ?? []);
    setLoading(false);
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
          Send USDC on Arc Testnet to this address. Grab test USDC from{" "}
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="underline">
            faucet.circle.com
          </a>. Balance refreshes after on-chain settlement (Phase 2).
        </p>
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
