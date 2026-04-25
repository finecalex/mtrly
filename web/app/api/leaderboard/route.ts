import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const revalidate = 30;

type Window = "7d" | "30d" | "all";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const win = (url.searchParams.get("window") as Window | null) ?? "all";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 50);

  const since =
    win === "7d" ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : win === "30d" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : null;

  const grouped = await db.payment.groupBy({
    by: ["toUserId"],
    where: since ? { createdAt: { gte: since } } : {},
    _sum: { amountUsdc: true },
    _count: { _all: true },
    orderBy: { _sum: { amountUsdc: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return NextResponse.json({ ok: true, window: win, items: [] });

  const userIds = grouped.map((g) => g.toUserId);

  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      slug: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      ownedEoaAddress: true,
      circleWalletAddr: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const onchain = await db.payment.groupBy({
    by: ["toUserId"],
    where: {
      toUserId: { in: userIds },
      settledOnchain: true,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    _count: { _all: true },
  });
  const onchainMap = new Map(onchain.map((o) => [o.toUserId, o._count._all]));

  const contentCounts = await db.contentUrl.groupBy({
    by: ["creatorId"],
    where: { creatorId: { in: userIds } },
    _count: { _all: true },
  });
  const contentCountMap = new Map(contentCounts.map((c) => [c.creatorId, c._count._all]));

  const items = grouped
    .map((g, idx) => {
      const u = userMap.get(g.toUserId);
      if (!u) return null;
      return {
        rank: idx + 1,
        userId: u.id,
        slug: u.slug,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        ownedEoaAddress: u.ownedEoaAddress ?? u.circleWalletAddr,
        lifetimeEarnedUsdc: (g._sum.amountUsdc ?? new Prisma.Decimal(0)).toString(),
        paymentCount: g._count._all,
        onchainSettledCount: onchainMap.get(g.toUserId) ?? 0,
        contentCount: contentCountMap.get(g.toUserId) ?? 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ ok: true, window: win, items });
}
