import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { arcExplorerTx, gatewayConfigured, getGatewayClient } from "@/lib/gateway";

export const dynamic = "force-dynamic";

const schema = z.object({
  amountUsdc: z.coerce.number().positive().max(100),
  destination: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const destination = parsed.data.destination ?? user.circleWalletAddr ?? user.walletAddress;
  if (!destination || !/^0x[a-fA-F0-9]{40}$/.test(destination)) {
    return NextResponse.json({ error: "no_destination_wallet" }, { status: 400 });
  }

  const amount = new Prisma.Decimal(parsed.data.amountUsdc.toFixed(6));
  const balance = await db.balance.findUnique({ where: { userId: uid } });
  if (!balance || new Prisma.Decimal(balance.amountUsdc).lt(amount)) {
    return NextResponse.json({ error: "insufficient_balance" }, { status: 402 });
  }

  let mintTxHash: string;
  try {
    const res = await getGatewayClient().withdraw(amount.toFixed(6), {
      recipient: destination as `0x${string}`,
    });
    mintTxHash = res.mintTxHash;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "gateway_withdraw_failed", reason: msg }, { status: 502 });
  }

  await db.$transaction([
    db.balance.update({
      where: { userId: uid },
      data: { amountUsdc: { decrement: amount } },
    }),
    db.balanceTransaction.create({
      data: {
        userId: uid,
        type: "withdraw",
        amountUsdc: amount.neg(),
        referenceId: `onchain:${mintTxHash}`,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    mintTxHash,
    amount: amount.toString(),
    recipient: destination,
    explorerUrl: arcExplorerTx(mintTxHash),
  });
}
