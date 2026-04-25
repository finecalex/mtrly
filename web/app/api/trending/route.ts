import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const windowMin = Math.max(5, Math.min(parseInt(url.searchParams.get("windowMin") ?? "60", 10) || 60, 1440));
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "5", 10) || 5, 20);
  const since = new Date(Date.now() - windowMin * 60 * 1000);

  const grouped = await db.payment.groupBy({
    by: ["contentId"],
    where: { contentId: { not: null }, createdAt: { gte: since } },
    _sum: { amountUsdc: true },
    _count: { _all: true },
    orderBy: { _sum: { amountUsdc: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) {
    return NextResponse.json({ ok: true, windowMin, items: [] });
  }
  const ids = grouped.map((g) => g.contentId).filter((x): x is number => x != null);
  const contents = await db.contentUrl.findMany({
    where: { id: { in: ids } },
    include: {
      creator: { select: { id: true, slug: true, displayName: true, avatarUrl: true } },
    },
  });
  const byId = new Map(contents.map((c) => [c.id, c]));

  const items = grouped
    .map((g) => {
      const c = g.contentId == null ? null : byId.get(g.contentId);
      if (!c) return null;
      return {
        id: c.id,
        kind: c.kind,
        title: c.title,
        description: c.description,
        previewImageUrl: c.previewImageUrl,
        windowVolumeUsdc: (g._sum.amountUsdc ?? new Prisma.Decimal(0)).toString(),
        windowPaymentCount: g._count._all,
        creator: c.creator,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ ok: true, windowMin, items });
}
