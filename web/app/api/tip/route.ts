import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { getPlatformUserId } from "@/lib/platform";
import { PRICING } from "@/lib/config";
import { gatewayConfigured, settleTickViaGateway } from "@/lib/gateway";
import { getUserGatewayClient } from "@/lib/userWallet";

const schema = z.object({
  toUserId: z.number().int().positive().optional(),
  toSlug: z.string().min(1).max(64).optional(),
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
  note: z.string().max(280).optional(),
}).refine((v) => v.toUserId || v.toSlug, { message: "to_required" });

export async function POST(req: NextRequest) {
  const fromId = await currentUserId();
  if (!fromId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const amount = new Prisma.Decimal(parseFloat(parsed.data.amountUsdc).toFixed(8));
  if (amount.lte(0)) return NextResponse.json({ error: "amount_must_be_positive" }, { status: 400 });
  if (amount.gt(50)) return NextResponse.json({ error: "amount_too_large" }, { status: 400 });

  const recipient = parsed.data.toUserId
    ? await db.user.findUnique({ where: { id: parsed.data.toUserId } })
    : await db.user.findUnique({ where: { slug: parsed.data.toSlug! } });
  if (!recipient) return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
  if (recipient.id === fromId) return NextResponse.json({ error: "cannot_tip_self" }, { status: 400 });

  const platformUserId = await getPlatformUserId();
  const creatorShare = amount.mul(PRICING.split.creator);
  const platformShare = amount.sub(creatorShare);

  let paymentId: number;
  try {
    paymentId = await db.$transaction(async (tx) => {
      const fromBalance = await tx.balance.findUnique({ where: { userId: fromId } });
      if (!fromBalance || new Prisma.Decimal(fromBalance.amountUsdc).lt(amount)) {
        throw new Error("insufficient_balance");
      }
      await tx.balance.update({
        where: { userId: fromId },
        data: { amountUsdc: { decrement: amount } },
      });
      await tx.balance.upsert({
        where: { userId: recipient.id },
        update: { amountUsdc: { increment: creatorShare } },
        create: { userId: recipient.id, amountUsdc: creatorShare },
      });
      await tx.balance.upsert({
        where: { userId: platformUserId },
        update: { amountUsdc: { increment: platformShare } },
        create: { userId: platformUserId, amountUsdc: platformShare },
      });

      const payment = await tx.payment.create({
        data: {
          fromUserId: fromId,
          toUserId: recipient.id,
          contentId: null,
          amountUsdc: amount,
          kind: "tip",
          note: parsed.data.note ?? null,
          settledOnchain: false,
        },
      });

      await tx.balanceTransaction.createMany({
        data: [
          { userId: fromId, type: "payment_out", amountUsdc: amount.neg(), referenceId: `tip:${payment.id}` },
          { userId: recipient.id, type: "payment_in", amountUsdc: creatorShare, referenceId: `tip:${payment.id}` },
          { userId: platformUserId, type: "platform_fee", amountUsdc: platformShare, referenceId: `tip:${payment.id}` },
        ],
      });

      return payment.id;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "tip_failed";
    if (msg === "insufficient_balance") {
      return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
    }
    return NextResponse.json({ error: "tip_failed", message: msg }, { status: 500 });
  }

  // fire-and-forget onchain settle
  if (gatewayConfigured()) {
    void (async () => {
      try {
        const userClient = await getUserGatewayClient(fromId).catch(() => null);
        const settle = await settleTickViaGateway({
          amountUsdc: parseFloat(amount.toString()),
          buyerClient: userClient ?? undefined,
        });
        if (settle.transaction) {
          await db.payment.update({
            where: { id: paymentId },
            data: { nanopaymentTxId: settle.transaction, onchainFromAddress: settle.buyer },
          });
        }
      } catch (err) {
        console.error(`[tip] onchain settle failed for payment ${paymentId}:`, err);
      }
    })();
  }

  const updatedBalance = await db.balance.findUnique({ where: { userId: fromId } });
  return NextResponse.json({
    ok: true,
    paymentId,
    amount: amount.toString(),
    creatorShare: creatorShare.toString(),
    platformShare: platformShare.toString(),
    recipient: { id: recipient.id, slug: recipient.slug, displayName: recipient.displayName },
    balance: updatedBalance?.amountUsdc.toString() ?? "0",
  });
}
