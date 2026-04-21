"use client";

import { useEffect, useState } from "react";

type Earnings = {
  balanceUsdc: string;
  lifetimeEarnedUsdc: string;
  lifetimePaymentCount: number;
  perContent: Array<{
    contentId: number | null;
    amountUsdc: string;
    payments: number;
    content: { title: string | null; normalizedUrl: string; kind: string } | null;
  }>;
  recent: Array<{
    id: number;
    amountUsdc: string;
    createdAt: string;
    fromDisplayName: string | null;
    content: { title: string | null; normalizedUrl: string; kind: string } | null;
    nanopaymentTxId: string | null;
    settledOnchain: boolean;
    explorerUrl: string | null;
  }>;
};

type ContentItem = {
  id: number;
  kind: string;
  rawUrl: string;
  normalizedUrl: string;
  title: string | null;
  createdAt: string;
  sessions: number;
  viewers: number;
};

type Me = {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
};

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const [meR, eR, cR] = await Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/creator/earnings").then((r) => r.json()),
      fetch("/api/creator/content").then((r) => r.json()),
    ]);
    setMe(meR.user ?? null);
    setEarnings(eR.error ? null : eR);
    setContents(cR.items ?? []);
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  async function addContent(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await fetch("/api/creator/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, title: title || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErr(data.error ?? "failed");
      return;
    }
    setUrl("");
    setTitle("");
    refresh();
  }

  if (me === undefined) {
    return <main className="p-8 text-muted">Loading…</main>;
  }
  if (me === null) {
    return (
      <main className="mx-auto max-w-5xl px-8 py-16">
        <div className="font-mono text-xs uppercase text-muted">mtrly / creator</div>
        <h1 className="mt-4 text-4xl font-semibold">Sign in required</h1>
        <p className="mt-3 text-muted">
          <a className="text-fg underline" href="/auth/login">Log in</a> or <a className="text-fg underline" href="/auth/signup">create an account</a> to use the creator dashboard.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xs uppercase text-muted">mtrly / creator / dashboard</div>
          <h1 className="mt-4 text-4xl font-semibold">{me.displayName ?? me.email}</h1>
          <p className="mt-1 text-sm text-muted">Role: {me.role}</p>
        </div>
        <a href="/balance" className="rounded border border-border px-4 py-2 font-mono text-xs uppercase hover:border-fg">
          View balance →
        </a>
      </div>

      <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Balance (USDC)" value={`$${fmt(earnings?.balanceUsdc)}`} sub="Spendable + unclaimed" />
        <Card title="Lifetime earned" value={`$${fmt(earnings?.lifetimeEarnedUsdc)}`} sub={`${earnings?.lifetimePaymentCount ?? 0} payments`} />
        <Card title="Registered URLs" value={contents.length.toString()} sub="YouTube + web" />
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase text-muted">Register new content</h2>
        <form onSubmit={addContent} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=…  or  https://your-article-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1 rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
          />
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg sm:w-60"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded border border-accent bg-accent px-5 py-2 font-mono text-sm text-bg hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "…" : "Register"}
          </button>
        </form>
        {err && <div className="mt-2 font-mono text-xs text-red-400">{err}</div>}
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase text-muted">Your content</h2>
        {contents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No content registered yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface font-mono text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Title / URL</th>
                  <th className="px-4 py-2 text-left">Kind</th>
                  <th className="px-4 py-2 text-right">Sessions</th>
                  <th className="px-4 py-2 text-right">Viewers</th>
                  <th className="px-4 py-2 text-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {contents.map((c) => {
                  const perRow = earnings?.perContent.find((p) => p.contentId === c.id);
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.title ?? "—"}</div>
                        <a
                          href={c.rawUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-muted hover:text-fg"
                        >
                          {c.normalizedUrl}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{c.kind}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{c.sessions}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{c.viewers}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">${fmt(perRow?.amountUsdc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase text-muted">Recent payments (last 20)</h2>
        {!earnings || earnings.recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No payments yet.</p>
        ) : (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {earnings.recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border py-2">
                <span className="text-muted shrink-0">{new Date(p.createdAt).toLocaleString()}</span>
                <span className="truncate">{p.content?.title ?? p.content?.normalizedUrl ?? "—"}</span>
                <span className="flex items-center gap-3 shrink-0">
                  {p.explorerUrl ? (
                    <a
                      href={p.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={p.nanopaymentTxId ?? ""}
                      className="text-accent hover:underline"
                    >
                      onchain ↗
                    </a>
                  ) : (
                    <span className="text-muted">offchain</span>
                  )}
                  <span className="text-fg">+${fmt(p.amountUsdc)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-border bg-surface p-5">
      <div className="font-mono text-xs uppercase text-muted">{title}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 font-mono text-xs text-muted">{sub}</div>}
    </div>
  );
}

function fmt(v?: string | null): string {
  if (v == null) return "0.0000";
  const n = Number(v);
  if (Number.isNaN(n)) return "0.0000";
  return n.toFixed(6);
}
