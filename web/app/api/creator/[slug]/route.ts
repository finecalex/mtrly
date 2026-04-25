import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  const uid = await currentUserId();
  const isAuthed = uid != null;
  const creator = await db.user.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      circleWalletAddr: true,
      ownedEoaAddress: true,
      walletAddress: true,
      createdAt: true,
    },
  });
  if (!creator) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const contents = await db.contentUrl.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sessions: true, payments: true } },
    },
  });
  const ids = contents.map((c) => c.id);

  let earningsByContent = new Map<number, { sum: Prisma.Decimal; count: number }>();
  let onchainByContent = new Map<number, number>();
  let viewersByContent = new Map<number, number>();
  let lifetimeEarned = new Prisma.Decimal(0);
  let lifetimePaymentCount = 0;
  let onchainSettledCount = 0;

  if (ids.length > 0) {
    const earnings = await db.payment.groupBy({
      by: ["contentId"],
      where: { contentId: { in: ids } },
      _sum: { amountUsdc: true },
      _count: { _all: true },
    });
    for (const e of earnings) {
      if (e.contentId == null) continue;
      const sum = e._sum.amountUsdc ?? new Prisma.Decimal(0);
      earningsByContent.set(e.contentId, { sum, count: e._count._all });
    }

    const onchain = await db.payment.groupBy({
      by: ["contentId"],
      where: { contentId: { in: ids }, settledOnchain: true },
      _count: { _all: true },
    });
    for (const o of onchain) if (o.contentId != null) onchainByContent.set(o.contentId, o._count._all);

    const viewers = await db.viewSession.groupBy({
      by: ["contentId"],
      where: { contentId: { in: ids } },
      _count: { _all: true },
    });
    for (const v of viewers) viewersByContent.set(v.contentId, v._count._all);
  }

  const totals = await db.payment.aggregate({
    where: { toUserId: creator.id },
    _sum: { amountUsdc: true },
    _count: { _all: true },
  });
  lifetimeEarned = totals._sum.amountUsdc ?? new Prisma.Decimal(0);
  lifetimePaymentCount = totals._count._all;

  const onchainTotal = await db.payment.count({
    where: { toUserId: creator.id, settledOnchain: true },
  });
  onchainSettledCount = onchainTotal;

  const ownerOrAuthed = isAuthed; // creators see same masking as anyone else not the owner; owner already manages from dashboard
  const content = contents.map((c) => {
    const e = earningsByContent.get(c.id);
    return {
      id: c.id,
      kind: c.kind,
      title: c.title,
      description: c.description,
      previewImageUrl: c.previewImageUrl,
      rawUrl: ownerOrAuthed ? c.rawUrl : null,
      normalizedUrl: ownerOrAuthed ? c.normalizedUrl : null,
      createdAt: c.createdAt.toISOString(),
      lifetimeEarnedUsdc: (e?.sum ?? new Prisma.Decimal(0)).toString(),
      paymentCount: e?.count ?? 0,
      onchainSettledCount: onchainByContent.get(c.id) ?? 0,
      viewerCount: viewersByContent.get(c.id) ?? 0,
      sessionCount: c._count.sessions,
    };
  });

  return NextResponse.json({
    ok: true,
    creator: {
      id: creator.id,
      slug: creator.slug,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl,
      bio: creator.bio,
      role: creator.role,
      walletAddress: creator.circleWalletAddr ?? creator.walletAddress,
      ownedEoaAddress: creator.ownedEoaAddress,
      createdAt: creator.createdAt.toISOString(),
    },
    content,
    stats: {
      lifetimeEarnedUsdc: lifetimeEarned.toString(),
      lifetimePaymentCount,
      onchainSettledCount,
      contentCount: content.length,
    },
  });
}
