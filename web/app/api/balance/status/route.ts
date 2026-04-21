import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: uid },
    select: {
      circleWalletAddr: true,
      balance: { select: { amountUsdc: true, updatedAt: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, amountUsdc: true, createdAt: true, referenceId: true },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    walletAddress: user.circleWalletAddr,
    balance: user.balance?.amountUsdc?.toString() ?? "0",
    updatedAt: user.balance?.updatedAt ?? null,
    transactions: user.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amountUsdc.toString(),
      createdAt: t.createdAt,
      reference: t.referenceId,
    })),
  });
}
