import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lock, Sparkles, ShieldCheck, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { splitParagraphs, renderInline } from "@/lib/articleBody";
import { hashGradient } from "@/lib/gradients";

export const dynamic = "force-dynamic";

async function loadArticle(id: number) {
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
  return { article, stats: { ...stats, onchain } };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await loadArticle(parseInt(params.id, 10));
  if (!data) return { title: "Article not found · Mtrly" };
  return {
    title: `${data.article.title ?? "Article"} · Mtrly`,
    description: data.article.description ?? undefined,
  };
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const data = await loadArticle(id);
  if (!data) notFound();

  const { article, stats } = data;
  const creator = article.creator;
  const slug = creator.slug;
  const uid = await currentUserId();
  const isAuthed = uid != null;
  const isOwner = uid === creator.id;
  const paragraphs = splitParagraphs(article.bodyMarkdown ?? "");
  const totalCost = paragraphs.length * 0.005;
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
            <Lock size={18} className="mt-0.5 text-accent" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">First paragraph is on the house.</h3>
              <p className="mt-1 text-sm text-muted">
                Mtrly meters by the second of attention — every paragraph you dwell on for ~3
                seconds debits $0.005 from your balance and pays the creator. Sign up to keep
                reading.
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/auth/signup?next=/a/${article.id}`}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
                >
                  Sign up to read →
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

      <article className="mt-10 space-y-6 text-base leading-relaxed">
        {paragraphs.map((p, i) => {
          const html = renderInline(p);
          const free = i === 0;
          const lockedForGuest = !isAuthed && !free;
          return (
            <p
              key={i}
              data-mtrly-paragraph={i}
              className={lockedForGuest ? "select-none blur-sm saturate-50" : undefined}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        })}
      </article>

      {!isAuthed && paragraphs.length > 1 && (
        <div className="mt-12 rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
          <h3 className="text-lg font-semibold">{paragraphs.length - 1} more paragraphs locked</h3>
          <p className="mt-1 text-sm text-muted">
            Sign up to unlock — pay only for what you actually read.
          </p>
          <Link
            href={`/auth/signup?next=/a/${article.id}`}
            className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            Sign up · ${totalCost.toFixed(3)} max to read it all
          </Link>
        </div>
      )}

      {isAuthed && !isOwner && (
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5 text-sm text-muted">
          <p>
            <Sparkles size={14} className="mr-1 inline" />
            Install the Mtrly extension to meter your reading. Each paragraph debits $0.005 after
            you dwell on it for ~3 seconds. Refresh-safe — you don&apos;t pay twice for paragraphs
            you already paid for.
          </p>
        </section>
      )}

      {isOwner && (
        <section className="mt-12 rounded-xl border border-yellow-300/30 bg-yellow-300/5 p-5 text-sm">
          <p className="font-mono text-[11px] uppercase text-yellow-300">Owner preview</p>
          <p className="mt-1 text-muted">
            You&apos;re viewing your own article. Earnings stats include all paid reads from other
            users — view the full breakdown in{" "}
            <Link href="/dashboard" className="underline">
              your dashboard
            </Link>
            .
          </p>
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
