"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, ExternalLink, BookOpen, Youtube, FileText, Wallet, Share2, Eye } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card as UICard, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EditContentDialog, EditableContent } from "@/components/EditContentDialog";
import { hashGradient } from "@/lib/gradients";

type Earnings = {
  balanceUsdc: string;
  lifetimeEarnedUsdc: string;
  lifetimePaymentCount: number;
  onchainSettledCount?: number;
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
    onchainTxHash: string | null;
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
  description: string | null;
  previewImageUrl: string | null;
  bodyMarkdown: string | null;
  createdAt: string;
  sessions: number;
  viewers: number;
};

type Me = {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
  walletAddress?: string | null;
  slug?: string | null;
  avatarUrl?: string | null;
};

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [mode, setMode] = useState<"url" | "article">("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artTitle, setArtTitle] = useState("");
  const [artDesc, setArtDesc] = useState("");
  const [artBody, setArtBody] = useState("");
  const [publishedArticle, setPublishedArticle] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableContent | null>(null);

  const [wdAmount, setWdAmount] = useState("");
  const [wdDest, setWdDest] = useState("");
  const [wdBusy, setWdBusy] = useState(false);
  const [wdResult, setWdResult] = useState<{ explorerUrl: string; recipient: string; amount: string } | null>(null);
  const [wdErr, setWdErr] = useState<string | null>(null);

  async function refresh() {
    fetch("/api/gateway/resolve", { method: "POST" }).catch(() => null);
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

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setWdErr(null);
    setWdResult(null);
    setWdBusy(true);
    const payload: Record<string, unknown> = { amountUsdc: parseFloat(wdAmount) };
    if (wdDest.trim()) payload.destination = wdDest.trim();
    const res = await fetch("/api/creator/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setWdBusy(false);
    if (!res.ok) {
      setWdErr(data.error ?? data.reason ?? "failed");
      return;
    }
    setWdResult({ explorerUrl: data.explorerUrl, recipient: data.recipient, amount: data.amount });
    setWdAmount("");
    refresh();
  }

  async function addContent(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await fetch("/api/creator/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "url",
        url,
        title: title || undefined,
        description: description || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErr(data.error ?? "failed");
      return;
    }
    setUrl("");
    setTitle("");
    setDescription("");
    refresh();
  }

  async function addArticle(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPublishedArticle(null);
    setSubmitting(true);
    const res = await fetch("/api/creator/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "article",
        title: artTitle,
        description: artDesc || undefined,
        body: artBody,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErr(data.error ?? "failed");
      return;
    }
    setPublishedArticle(data.articleUrl ?? null);
    setArtTitle("");
    setArtDesc("");
    setArtBody("");
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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar
            size={56}
            name={me.displayName}
            email={me.email}
            seed={me.slug ?? me.email}
            src={me.avatarUrl ?? undefined}
          />
          <div>
            <div className="font-mono text-[10px] uppercase text-muted">mtrly · creator dashboard</div>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              {me.displayName ?? me.email}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="muted">{me.role}</Badge>
              {me.slug && (
                <Link
                  href={`/c/${me.slug}`}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase text-muted hover:text-fg"
                >
                  <Eye size={11} /> /c/{me.slug}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {me.slug && (
            <Link href={`/c/${me.slug}`}>
              <Button variant="secondary" size="sm">
                <Share2 size={14} /> View public page
              </Button>
            </Link>
          )}
          <Link href="/balance">
            <Button variant="secondary" size="sm">
              <Wallet size={14} /> Balance
            </Button>
          </Link>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Balance (USDC)"
          value={`$${fmt(earnings?.balanceUsdc)}`}
          sub="Spendable + unclaimed"
        />
        <StatCard
          label="Lifetime earned"
          value={`$${fmt(earnings?.lifetimeEarnedUsdc)}`}
          sub={`${earnings?.lifetimePaymentCount ?? 0} payments · ${earnings?.onchainSettledCount ?? 0} onchain`}
          accent
        />
        <StatCard
          label="Active content"
          value={contents.length.toString()}
          sub="across YouTube · web · articles"
        />
      </section>

      {me.walletAddress && (
        <section className="mt-6 rounded border border-green-400/30 bg-green-400/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase text-green-400">Onchain settlement proof</div>
              <div className="mt-1 font-mono text-xs text-muted">
                Payouts to your wallet settle on Arc Testnet. All incoming batches are verifiable onchain.
              </div>
              <div className="mt-1 break-all font-mono text-[11px]">{me.walletAddress}</div>
            </div>
            <a
              href={`https://testnet.arcscan.app/address/${me.walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded border border-green-400/50 px-3 py-2 font-mono text-[10px] uppercase text-green-400 hover:bg-green-400/10"
            >
              View wallet on arcscan ↗
            </a>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase text-muted">Withdraw to wallet</h2>
        <p className="mt-2 text-sm text-muted">
          Cash out your USDC balance to any Arc-testnet address via Circle Gateway. Defaults to your Circle wallet.
        </p>
        <form onSubmit={withdraw} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            step="0.000001"
            min="0"
            max="100"
            placeholder="Amount (USDC)"
            value={wdAmount}
            onChange={(e) => setWdAmount(e.target.value)}
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg sm:w-48"
          />
          <input
            type="text"
            placeholder={me.walletAddress ?? "0x… destination (optional)"}
            value={wdDest}
            onChange={(e) => setWdDest(e.target.value)}
            className="flex-1 rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
          />
          <button
            type="submit"
            disabled={wdBusy}
            className="rounded border border-accent bg-accent px-5 py-2 font-mono text-sm text-bg hover:opacity-90 disabled:opacity-40"
          >
            {wdBusy ? "…" : "Withdraw"}
          </button>
        </form>
        {wdErr && <div className="mt-2 font-mono text-xs text-red-400">{wdErr}</div>}
        {wdResult && (
          <div className="mt-3 rounded border border-border bg-surface p-3 font-mono text-xs">
            <div className="text-muted">Withdrew ${fmt(wdResult.amount)} to {wdResult.recipient}</div>
            <a
              href={wdResult.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              View on arcscan ↗
            </a>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase text-muted">Publish new content</h2>
        <div className="mt-3 flex gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm transition-colors ${
              mode === "url" ? "bg-bg text-fg" : "text-muted hover:text-fg"
            }`}
          >
            Register external URL
          </button>
          <button
            type="button"
            onClick={() => setMode("article")}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm transition-colors ${
              mode === "article" ? "bg-bg text-fg" : "text-muted hover:text-fg"
            }`}
          >
            Write article on Mtrly
          </button>
        </div>

        {mode === "url" ? (
          <form onSubmit={addContent} className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-muted">
              For YouTube, the thumbnail is auto-detected. The URL stays hidden from logged-out
              visitors so they can&apos;t skip the meter.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
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
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg sm:w-60"
              />
            </div>
            <textarea
              placeholder="Short description shown on previews (max 280 chars)…"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 280))}
              rows={2}
              className="rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted">{description.length}/280</span>
              <button
                type="submit"
                disabled={submitting}
                className="rounded border border-accent bg-accent px-5 py-2 font-mono text-sm text-bg hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? "…" : "Register URL"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={addArticle} className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-muted">
              Write directly on Mtrly. Each paragraph (separated by a blank line) is metered at
              $0.005 per ~3-second dwell. The first paragraph is always free as a teaser; the rest
              unlock as the reader pays.
            </p>
            <input
              type="text"
              placeholder="Article title"
              value={artTitle}
              onChange={(e) => setArtTitle(e.target.value)}
              required
              className="rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
            />
            <textarea
              placeholder="One-line description shown on previews (max 280 chars)…"
              value={artDesc}
              onChange={(e) => setArtDesc(e.target.value.slice(0, 280))}
              rows={2}
              className="rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
            />
            <textarea
              placeholder="Article body. Separate paragraphs with a blank line. Markdown light: **bold**, *italic*, [link](https://…)."
              value={artBody}
              onChange={(e) => setArtBody(e.target.value.slice(0, 50000))}
              rows={12}
              required
              className="rounded border border-border bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-fg"
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted">
                {artBody.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length} paragraphs ·{" "}
                {artBody.length}/50000 chars
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="rounded border border-accent bg-accent px-5 py-2 font-mono text-sm text-bg hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? "…" : "Publish article"}
              </button>
            </div>
            {publishedArticle && (
              <div className="rounded border border-accent/30 bg-accent/5 p-3 text-sm">
                Published →{" "}
                <a href={publishedArticle} className="text-accent underline" target="_blank" rel="noreferrer">
                  {publishedArticle}
                </a>
              </div>
            )}
          </form>
        )}
        {err && <div className="mt-2 font-mono text-xs text-red-400">{err}</div>}
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Your content</h2>
          <span className="font-mono text-[10px] uppercase text-muted">{contents.length} items</span>
        </div>
        {contents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No content yet. Use the form above to register a URL or write your first article on Mtrly.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {contents.map((c) => (
              <ContentRow
                key={c.id}
                content={c}
                earnings={earnings?.perContent.find((p) => p.contentId === c.id)}
                onEdit={() => setEditing(c)}
              />
            ))}
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
                      title={p.onchainTxHash ?? ""}
                      className="text-accent hover:underline"
                    >
                      onchain ↗
                    </a>
                  ) : p.nanopaymentTxId ? (
                    <span className="text-muted" title={p.nanopaymentTxId}>batching…</span>
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

      {editing && (
        <EditContentDialog
          content={editing}
          onClose={() => setEditing(null)}
          onSaved={() => refresh()}
        />
      )}
    </main>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <UICard>
      <CardContent className="p-5">
        <div className="font-mono text-[10px] uppercase text-muted">{label}</div>
        <div className={`mt-2 text-3xl font-semibold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</div>
        {sub && <div className="mt-1 font-mono text-xs text-muted">{sub}</div>}
      </CardContent>
    </UICard>
  );
}

function ContentRow({
  content,
  earnings,
  onEdit,
}: {
  content: ContentItem;
  earnings?: { amountUsdc: string; payments: number };
  onEdit: () => void;
}) {
  const isMtrly = content.kind === "mtrly";
  const isYoutube = content.kind === "youtube";
  const KindIcon = isYoutube ? Youtube : isMtrly ? BookOpen : FileText;
  const href = isMtrly ? `/a/${content.id}` : content.rawUrl;
  const grad = hashGradient(`${content.kind}-${content.id}-${content.title ?? ""}`);
  const earned = earnings ? parseFloat(earnings.amountUsdc) : 0;

  return (
    <UICard className="overflow-hidden">
      <div className="flex">
        <div
          className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden"
          style={{ background: grad }}
        >
          {content.previewImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.previewImageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <KindIcon size={28} className="text-white/70" />
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold">
                {content.title ?? <span className="italic text-muted">Untitled</span>}
              </div>
              {content.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted">{content.description}</p>
              ) : (
                <p className="mt-1 text-xs italic text-muted/60">No description.</p>
              )}
            </div>
            <Badge variant="kind">
              <KindIcon size={10} />
              {content.kind}
            </Badge>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <div className="flex gap-3 font-mono text-[10px] text-muted">
              <span>
                <span className="text-fg tabular-nums">{content.sessions}</span> sessions
              </span>
              <span>
                <span className="text-fg tabular-nums">{content.viewers}</span> viewers
              </span>
              <span>
                <span className="text-accent tabular-nums">${earned.toFixed(4)}</span> earned
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                title="Edit"
                className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-fg"
              >
                <Pencil size={13} />
              </button>
              {href && (
                <a
                  href={href}
                  target={isMtrly ? "_self" : "_blank"}
                  rel="noreferrer"
                  title="Open"
                  className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-fg"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </UICard>
  );
}

function fmt(v?: string | null): string {
  if (v == null) return "0.0000";
  const n = Number(v);
  if (Number.isNaN(n)) return "0.0000";
  return n.toFixed(6);
}
