import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ user: null });

  const user = await db.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      circleWalletAddr: true,
      slug: true,
      avatarUrl: true,
      balance: { select: { amountUsdc: true } },
    },
  });

  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      walletAddress: user.circleWalletAddr,
      slug: user.slug,
      avatarUrl: user.avatarUrl,
      balance: user.balance?.amountUsdc?.toString() ?? "0",
    },
  });
}
