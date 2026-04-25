import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 30);
  const toSlug = url.searchParams.get("toSlug")?.trim();
  const requireNote = url.searchParams.get("withNote") === "1";

  const where: Record<string, unknown> = { kind: "tip" };
  if (requireNote) where.note = { not: null };
  if (toSlug) {
    const recipient = await db.user.findUnique({ where: { slug: toSlug }, select: { id: true } });
    if (!recipient) return NextResponse.json({ ok: true, items: [] });
    where.toUserId = recipient.id;
  }

  const tips = await db.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      amountUsdc: true,
      note: true,
      createdAt: true,
      onchainTxHash: true,
      settledOnchain: true,
      onchainFromAddress: true,
      fromUser: { select: { id: true, slug: true, displayName: true, avatarUrl: true } },
      toUser: { select: { id: true, slug: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    items: tips.map((t) => ({
      id: t.id,
      amountUsdc: t.amountUsdc.toString(),
      note: t.note,
      createdAt: t.createdAt.toISOString(),
      explorerUrl: t.onchainTxHash
        ? `https://testnet.arcscan.app/tx/${t.onchainTxHash}`
        : null,
      settledOnchain: t.settledOnchain,
      onchainFromAddress: t.onchainFromAddress,
      from: t.fromUser,
      to: t.toUser,
    })),
  });
}
