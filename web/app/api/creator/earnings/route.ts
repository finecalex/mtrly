import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { PRICING } from "@/lib/config";

const SHARE = new Prisma.Decimal(PRICING.split.creator);

function scale(raw: string | null | undefined): string {
  if (!raw) return "0";
  return new Prisma.Decimal(raw).mul(SHARE).toFixed(8);
}

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [balance, totals, recent, perContent] = await Promise.all([
    db.balance.findUnique({ where: { userId: uid } }),
    db.payment.aggregate({
      where: { toUserId: uid },
      _sum: { amountUsdc: true },
      _count: true,
    }),
    db.payment.findMany({
      where: { toUserId: uid },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        content: { select: { title: true, normalizedUrl: true, kind: true } },
        fromUser: { select: { displayName: true } },
      },
    }),
    db.payment.groupBy({
      by: ["contentId"],
      where: { toUserId: uid },
      _sum: { amountUsdc: true },
      _count: true,
    }),
  ]);

  const contentMap = new Map<number, { title: string | null; normalizedUrl: string; kind: string }>();
  if (perContent.length > 0) {
    const ids = perContent.map((r) => r.contentId).filter((x): x is number => x != null);
    const contents = await db.contentUrl.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, normalizedUrl: true, kind: true },
    });
    for (const c of contents) contentMap.set(c.id, { title: c.title, normalizedUrl: c.normalizedUrl, kind: c.kind });
  }

  return NextResponse.json({
    balanceUsdc: balance?.amountUsdc.toString() ?? "0",
    lifetimeEarnedUsdc: scale(totals._sum.amountUsdc?.toString()),
    lifetimePaymentCount: totals._count,
    perContent: perContent.map((r) => ({
      contentId: r.contentId,
      amountUsdc: scale(r._sum.amountUsdc?.toString()),
      payments: r._count,
      content: r.contentId != null ? contentMap.get(r.contentId) ?? null : null,
    })),
    recent: recent.map((p) => ({
      id: p.id,
      amountUsdc: scale(p.amountUsdc.toString()),
      createdAt: p.createdAt,
      fromDisplayName: p.fromUser.displayName,
      content: p.content ? { title: p.content.title, normalizedUrl: p.content.normalizedUrl, kind: p.content.kind } : null,
    })),
  });
}
