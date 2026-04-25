import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles, ShieldCheck, ExternalLink, BookOpen, ArrowRight, MousePointerClick } from "lucide-react";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { splitParagraphs, renderInline, readTimeMinutes, firstParagraphPreview } from "@/lib/articleBody";
import { hashGradient } from "@/lib/gradients";
import { MeteredArticle } from "@/components/MeteredArticle";

export const dynamic = "force-dynamic";

async function loadArticle(id: number, viewerId: number | null) {
  if (!Number.isFinite(id) || id <= 0) return null;
  const article = await db.contentUrl.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, slug: true, displayName: true, avatarUrl: true, bio: true, ownedEoaAddress: true, circleWalletAddr: true },
      },
    },
  });
  if (!article || article.kind !== "mtrly" || !article.bodyMarkdown) return null;
  const stats = await db.payment.aggregate({
    where: { contentId: article.id },
    _sum: { amountUsdc: true },
    _count: { _all: true },
  });
  const onchain = await db.payment.count({
    where: { contentId: article.id, settledOnchain: true },
  });
  const moreByAuthor = await db.contentUrl.findMany({
    where: { creatorId: article.creator.id, kind: "mtrly", id: { not: article.id } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, description: true, createdAt: true, bodyMarkdown: true },
  });
  let initialPaidCount = 0;
  if (viewerId && viewerId !== article.creator.id) {
    const consumption = await db.consumption.findUnique({
      where: { viewerId_contentId: { viewerId, contentId: article.id } },
      select: { unitsConsumed: true },
    });
    initialPaidCount = consumption?.unitsConsumed ?? 0;
  }
  return { article, stats: { ...stats, onchain }, moreByAuthor, initialPaidCount };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await loadArticle(parseInt(params.id, 10), null);
  if (!data) return { title: "Article not found · Mtrly" };
  const title = data.article.title ?? "Article";
  const description =
    data.article.description ??
    `${readTimeMinutes(data.article.bodyMarkdown ?? "")} min read on Mtrly. Pay-per-paragraph nanopayments on Arc Testnet.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const uid = await currentUserId();
  const data = await loadArticle(id, uid);
  if (!data) notFound();

  const { article, stats, moreByAuthor, initialPaidCount } = data;
  const creator = article.creator;
  const slug = creator.slug;
  const isAuthed = uid != null;
  const isOwner = uid === creator.id;
  const rawParagraphs = splitParagraphs(article.bodyMarkdown ?? "");
  const paragraphs = rawParagraphs.map((p, i) => ({ idx: i, html: renderInline(p) }));
  const totalCost = paragraphs.length * 0.005;
  const readMin = readTimeMinutes(article.bodyMarkdown ?? "");
  const settleAddr = creator.ownedEoaAddress ?? creator.circleWalletAddr;
  const grad = hashGradient(`article-${article.id}`);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="font-mono text-xs uppercase text-muted">mtrly / a / {article.id}</div>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
        {article.title ?? "Untitled"}
      </h1>

      {article.description && (
        <p className="mt-4 text-lg leading-relaxed text-muted">{article.description}</p>
      )}

      <div
        className="mt-6 flex aspect-[3/1] w-full items-center justify-center rounded-2xl border border-border/60"
        style={{ background: grad }}
      >
        <Sparkles size={36} className="text-white/60" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href={slug ? `/c/${slug}` : "#"}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 hover:border-fg"
        >
          <Avatar
            size={28}
            name={creator.displayName}
            email={null}
            seed={slug ?? String(creator.id)}
            src={creator.avatarUrl ?? undefined}
          />
          <div className="text-sm">
            <div className="font-medium">{creator.displayName ?? slug ?? "Creator"}</div>
            {slug && <div className="font-mono text-[10px] uppercase text-muted">/c/{slug}</div>}
          </div>
        </Link>
        <Badge variant="kind">mtrly · article</Badge>
        <Badge variant="muted">~{readMin} min read</Badge>
        <Badge variant="muted">{paragraphs.length} paragraphs · ~${totalCost.toFixed(3)} to fully read</Badge>
        {stats.onchain > 0 && (
          <Badge variant="onchain">
            <ShieldCheck size={10} /> {stats.onchain} onchain settlements
          </Badge>
        )}
      </div>

      {!isAuthed && (
        <section className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-start gap-3">
            <MousePointerClick size={18} className="mt-0.5 text-accent" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">First paragraph is on the house.</h3>
              <p className="mt-1 text-sm text-muted">
                Mtrly meters reading paragraph by paragraph. Tap any blurred paragraph to reveal
                it &mdash; $0.005 flows from your balance to the creator on the spot. No
                subscriptions, no all-or-nothing paywall. Sign up to keep going.
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/auth/signup?next=/a/${article.id}`}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
                >
                  Sign up to read
                </Link>
                <Link
                  href={`/auth/login?next=/a/${article.id}`}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:border-fg"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <MeteredArticle
        paragraphs={paragraphs}
        contentId={article.id}
        articleId={article.id}
        viewerId={uid}
        isAuthed={isAuthed}
        isOwner={isOwner}
        initialPaidCount={initialPaidCount}
      />

      {isAuthed && !isOwner && (
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5 text-sm text-muted">
          <p>
            <Sparkles size={14} className="mr-1 inline text-accent" />
            Tap-to-reveal is the new default on Mtrly articles &mdash; each tap is a real onchain
            nanopayment to the creator (batched and settled on Arc Testnet). Refresh-safe: the
            paragraphs you&apos;ve already paid for stay open the next time you come back.
          </p>
        </section>
      )}

      {isOwner && (
        <section className="mt-12 rounded-xl border border-yellow-300/30 bg-yellow-300/5 p-5 text-sm">
          <p className="font-mono text-[11px] uppercase text-yellow-300">Owner preview</p>
          <p className="mt-1 text-muted">
            You&apos;re viewing your own article. Earnings stats include all paid reads from other
            users, view the full breakdown in{" "}
            <Link href="/dashboard" className="underline">
              your dashboard
            </Link>
            .
          </p>
        </section>
      )}

      {creator.bio && (
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5">
          <div className="flex items-start gap-3">
            <Avatar
              size={44}
              name={creator.displayName}
              email={null}
              seed={slug ?? String(creator.id)}
              src={creator.avatarUrl ?? undefined}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">About {creator.displayName ?? slug}</div>
              <p className="mt-1 text-sm text-muted">{creator.bio}</p>
              {slug && (
                <Link
                  href={`/c/${slug}`}
                  className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-accent hover:underline"
                >
                  View all content <ArrowRight size={11} />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {moreByAuthor.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">More by {creator.displayName ?? slug}</h2>
            {slug && (
              <Link href={`/c/${slug}`} className="flex items-center gap-1 font-mono text-[10px] uppercase text-muted hover:text-fg">
                all <ArrowRight size={11} />
              </Link>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {moreByAuthor.map((m) => {
              const g = hashGradient(`mtrly-${m.id}-${m.title ?? ""}`);
              const preview = firstParagraphPreview(m.bodyMarkdown ?? "", 120);
              return (
                <Link
                  key={m.id}
                  href={`/a/${m.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface/50 transition-colors hover:border-accent/40"
                >
                  <div
                    className="flex aspect-video w-full items-center justify-center"
                    style={{ background: g }}
                  >
                    <BookOpen size={24} className="text-white/70" />
                  </div>
                  <div className="flex-1 p-3">
                    <div className="line-clamp-2 text-sm font-semibold">{m.title ?? "Untitled"}</div>
                    {(m.description || preview) && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {m.description ?? preview}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {settleAddr && (
        <div className="mt-10 border-t border-border pt-6 text-sm text-muted">
          Earnings settle to{" "}
          <a
            href={`https://testnet.arcscan.app/address/${settleAddr}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-fg hover:underline"
          >
            {settleAddr.slice(0, 8)}…{settleAddr.slice(-6)} <ExternalLink size={10} className="inline" />
          </a>{" "}
          on Arc Testnet.
        </div>
      )}
    </main>
  );
}
