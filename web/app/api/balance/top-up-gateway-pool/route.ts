import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { getGatewayClient, gatewayConfigured } from "@/lib/gateway";

const schema = z.object({
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
});

export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const amount = new Prisma.Decimal(parseFloat(parsed.data.amountUsdc).toFixed(8));
  if (amount.lte(0)) return NextResponse.json({ error: "amount_must_be_positive" }, { status: 400 });
  if (amount.gt(100)) return NextResponse.json({ error: "amount_too_large" }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: uid },
    select: { ownedEoaAddress: true, balance: true },
  });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  if (!user.ownedEoaAddress) {
    return NextResponse.json({ error: "no_eoa_provisioned" }, { status: 400 });
  }
  const balance = user.balance ? new Prisma.Decimal(user.balance.amountUsdc) : new Prisma.Decimal(0);
  if (balance.lt(amount)) {
    return NextResponse.json({ error: "insufficient_balance", balance: balance.toString() }, { status: 400 });
  }

  // Decrement balance + log a withdraw-style ledger entry first; if onchain
  // fails we'll refund.
  const ledger = await db.$transaction([
    db.balance.update({
      where: { userId: uid },
      data: { amountUsdc: { decrement: amount } },
    }),
    db.balanceTransaction.create({
      data: {
        userId: uid,
        type: "withdraw",
        amountUsdc: amount.neg(),
        referenceId: `gateway-pool-topup:pending`,
      },
    }),
  ]);
  const txId = ledger[1].id;

  let depositTxHash: string | null = null;
  let approvalTxHash: string | null = null;
  try {
    const platform = getGatewayClient();
    const res = await platform.depositFor(
      parsed.data.amountUsdc,
      user.ownedEoaAddress as `0x${string}`,
    );
    depositTxHash = res.depositTxHash ?? null;
    approvalTxHash = res.approvalTxHash ?? null;
    await db.balanceTransaction.update({
      where: { id: txId },
      data: { referenceId: `gateway-pool-topup:${depositTxHash ?? "ok"}` },
    });
  } catch (err) {
    // refund
    await db.$transaction([
      db.balance.update({
        where: { userId: uid },
        data: { amountUsdc: { increment: amount } },
      }),
      db.balanceTransaction.update({
        where: { id: txId },
        data: { referenceId: `gateway-pool-topup:failed-refunded` },
      }),
    ]);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "deposit_failed", message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    amount: amount.toString(),
    depositor: user.ownedEoaAddress,
    depositTxHash,
    approvalTxHash,
    explorerUrl: depositTxHash ? `https://testnet.arcscan.app/tx/${depositTxHash}` : null,
  });
}
