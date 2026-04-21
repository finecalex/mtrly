import { Prisma } from "@prisma/client";
import { db } from "./db";
import { PRICING } from "./config";
import { getPlatformUserId } from "./platform";

export type TickKind = "youtube" | "web";

export type TickResult =
  | {
      ok: true;
      sessionId: string;
      tickAmount: string;
      totalSpent: string;
      tickCount: number;
      balance: string;
      unlocked: boolean;
      unitsConsumed: number;
    }
  | { ok: false; reason: "insufficient" | "session_not_found" | "session_mismatch" };

function tickAmountFor(kind: TickKind): Prisma.Decimal {
  const raw = kind === "youtube" ? PRICING.video.tickAmount : PRICING.text.pricePerParagraph;
  return new Prisma.Decimal(raw.toFixed(8));
}

export async function applyTick(params: {
  viewerId: number;
  sessionId: string;
}): Promise<TickResult> {
  const { viewerId, sessionId } = params;

  const session = await db.viewSession.findUnique({
    where: { id: sessionId },
    include: { content: true },
  });
  if (!session) return { ok: false, reason: "session_not_found" };
  if (session.viewerId !== viewerId) return { ok: false, reason: "session_mismatch" };

  const kind: TickKind = session.content.kind === "youtube" ? "youtube" : "web";
  const amount = tickAmountFor(kind);
  const creatorShare = amount.mul(PRICING.split.creator);
  const platformShare = amount.sub(creatorShare);

  const platformUserId = await getPlatformUserId();
  const creatorId = session.content.creatorId;

  try {
    return await db.$transaction(async (tx) => {
      const viewerBalance = await tx.balance.findUnique({ where: { userId: viewerId } });
      if (!viewerBalance || new Prisma.Decimal(viewerBalance.amountUsdc).lt(amount)) {
        throw new InsufficientBalanceError();
      }

      await tx.balance.update({
        where: { userId: viewerId },
        data: { amountUsdc: { decrement: amount } },
      });
      await tx.balance.upsert({
        where: { userId: creatorId },
        update: { amountUsdc: { increment: creatorShare } },
        create: { userId: creatorId, amountUsdc: creatorShare },
      });
      await tx.balance.upsert({
        where: { userId: platformUserId },
        update: { amountUsdc: { increment: platformShare } },
        create: { userId: platformUserId, amountUsdc: platformShare },
      });

      const payment = await tx.payment.create({
        data: {
          fromUserId: viewerId,
          toUserId: creatorId,
          contentId: session.contentId,
          amountUsdc: amount,
          settledOnchain: false,
        },
      });

      await tx.balanceTransaction.createMany({
        data: [
          { userId: viewerId, type: "payment_out", amountUsdc: amount.neg(), referenceId: `pay:${payment.id}` },
          { userId: creatorId, type: "payment_in", amountUsdc: creatorShare, referenceId: `pay:${payment.id}` },
          { userId: platformUserId, type: "platform_fee", amountUsdc: platformShare, referenceId: `pay:${payment.id}` },
        ],
      });

      const updatedSession = await tx.viewSession.update({
        where: { id: sessionId },
        data: {
          lastTickAt: new Date(),
          tickCount: { increment: 1 },
          totalSpent: { increment: amount },
        },
      });

      const consumption = await tx.consumption.upsert({
        where: { viewerId_contentId: { viewerId, contentId: session.contentId } },
        update: {
          unitsConsumed: { increment: 1 },
          totalPaidUsdc: { increment: amount },
        },
        create: {
          viewerId,
          contentId: session.contentId,
          unitsConsumed: 1,
          totalPaidUsdc: amount,
        },
      });

      const fullUnitPrice =
        kind === "youtube"
          ? new Prisma.Decimal(PRICING.video.pricePerMinute)
          : new Prisma.Decimal(PRICING.text.pricePerParagraph);
      const unlockAt = fullUnitPrice.mul(PRICING.unlockThreshold);
      const isUnlocked = new Prisma.Decimal(consumption.totalPaidUsdc).gte(unlockAt);
      if (isUnlocked && !consumption.isUnlocked) {
        await tx.consumption.update({
          where: { id: consumption.id },
          data: { isUnlocked: true },
        });
      }

      const newViewerBalance = await tx.balance.findUnique({ where: { userId: viewerId } });

      return {
        ok: true as const,
        sessionId,
        tickAmount: amount.toString(),
        totalSpent: new Prisma.Decimal(updatedSession.totalSpent).toString(),
        tickCount: updatedSession.tickCount,
        balance: newViewerBalance?.amountUsdc.toString() ?? "0",
        unlocked: isUnlocked,
        unitsConsumed: consumption.unitsConsumed,
      };
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return { ok: false, reason: "insufficient" };
    }
    throw e;
  }
}

class InsufficientBalanceError extends Error {
  constructor() {
    super("insufficient_balance");
  }
}
