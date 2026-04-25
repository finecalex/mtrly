import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const revalidate = 30;

type Sort = "recent" | "trending" | "earnings";
type KindFilter = "all" | "youtube" | "web";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sort = (url.searchParams.get("sort") as Sort | null) ?? "recent";
  const kindParam = (url.searchParams.get("kind") as KindFilter | null) ?? "all";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 100);

  const whereKind = kindParam === "all" ? {} : { kind: kindParam };

  // Pull contents + creator
  const contents = await db.contentUrl.findMany({
    where: whereKind,
    take: limit * 2, // overfetch then sort/trim
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          avatarUrl: true,
          ownedEoaAddress: true,
        },
      },
      _count: { select: { sessions: true, payments: true } },
    },
  });

  const ids = contents.map((c) => c.id);
  if (ids.length === 0) return NextResponse.json({ ok: true, items: [] });

  // Aggregate: lifetime earned + viewers + onchain count + trending (7d) per content
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const earnings = await db.payment.groupBy({
    by: ["contentId"],
    where: { contentId: { in: ids } },
    _sum: { amountUsdc: true },
    _count: { _all: true },
  });
  const earningsMap = new Map<number, { sum: Prisma.Decimal; count: number }>();
  for (const e of earnings) {
    if (e.contentId == null) continue;
    earningsMap.set(e.contentId, { sum: e._sum.amountUsdc ?? new Prisma.Decimal(0), count: e._count._all });
  }

  const onchain = await db.payment.groupBy({
    by: ["contentId"],
    where: { contentId: { in: ids }, settledOnchain: true },
    _count: { _all: true },
  });
  const onchainMap = new Map<number, number>();
  for (const o of onchain) if (o.contentId != null) onchainMap.set(o.contentId, o._count._all);

  const trending = await db.payment.groupBy({
    by: ["contentId"],
    where: { contentId: { in: ids }, createdAt: { gte: sevenDaysAgo } },
    _sum: { amountUsdc: true },
  });
  const trendingMap = new Map<number, Prisma.Decimal>();
  for (const t of trending) if (t.contentId != null) trendingMap.set(t.contentId, t._sum.amountUsdc ?? new Prisma.Decimal(0));

  const viewers = await db.viewSession.groupBy({
    by: ["contentId"],
    where: { contentId: { in: ids } },
    _count: { _all: true },
  });
  const viewersMap = new Map<number, number>();
  for (const v of viewers) viewersMap.set(v.contentId, v._count._all);

  const items = contents.map((c) => {
    const e = earningsMap.get(c.id);
    return {
      id: c.id,
      kind: c.kind,
      rawUrl: c.rawUrl,
      normalizedUrl: c.normalizedUrl,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      creator: {
        id: c.creator.id,
        slug: c.creator.slug,
        displayName: c.creator.displayName,
        avatarUrl: c.creator.avatarUrl,
        ownedEoaAddress: c.creator.ownedEoaAddress,
      },
      lifetimeEarnedUsdc: (e?.sum ?? new Prisma.Decimal(0)).toString(),
      paymentCount: e?.count ?? 0,
      onchainSettledCount: onchainMap.get(c.id) ?? 0,
      trending7dUsdc: (trendingMap.get(c.id) ?? new Prisma.Decimal(0)).toString(),
      viewerCount: viewersMap.get(c.id) ?? 0,
      sessionCount: c._count.sessions,
    };
  });

  let sorted = items;
  if (sort === "earnings") {
    sorted = [...items].sort((a, b) => parseFloat(b.lifetimeEarnedUsdc) - parseFloat(a.lifetimeEarnedUsdc));
  } else if (sort === "trending") {
    sorted = [...items].sort((a, b) => parseFloat(b.trending7dUsdc) - parseFloat(a.trending7dUsdc));
  }

  return NextResponse.json({ ok: true, items: sorted.slice(0, limit) });
}
