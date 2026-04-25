import { Prisma } from "@prisma/client";
import { db } from "./db";
import { gatewayConfigured, getGatewayClient, resetGatewayClient, arcExplorerTx } from "./gateway";

// Per-creator auto-cashout. When a creator's Balance.autoWithdrawThresholdUsdc
// is set and their balance crosses that threshold, we kick off a Gateway
// mint to their EOA in the background. The whole creator balance flushes in
// one onchain tx — that's the "batch per creator" the user asked for.
//
// Atomic flow:
//   1. Inside a transaction: re-check balance, decrement to zero, write a
//      pending BalanceTransaction (referenceId="auto-withdraw:pending")
//   2. Outside the transaction: call Gateway.withdraw(amount, recipient=EOA)
//   3. On success: stamp the BalanceTransaction with onchain:<hash>
//   4. On failure: refund (re-credit balance) and mark the row as failed
//
// Best-effort: never throws to caller (called fire-and-forget from applyTick).
// Idempotent across concurrent ticks because step 1 atomically reads + zeroes
// the balance, so a second tick sees zero and skips.

const MIN_WITHDRAW = new Prisma.Decimal("0.01");

// In-process cooldown: after a failed withdrawal attempt, skip all retries for
// 60 seconds. Prevents a single gateway error from triggering a rapid-fire storm
// of retries on every subsequent tick (which fires every 5s).
const failCooldown = new Map<number, number>();
const COOLDOWN_MS = 60_000;

export async function maybeAutoWithdrawForCreator(creatorId: number): Promise<void> {
  if (!gatewayConfigured()) return;

  const lastFail = failCooldown.get(creatorId);
  if (lastFail !== undefined && Date.now() - lastFail < COOLDOWN_MS) return;

  try {
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { ownedEoaAddress: true, circleWalletAddr: true },
    });
    const recipient = creator?.ownedEoaAddress ?? creator?.circleWalletAddr ?? null;
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) return;

    const balance = await db.balance.findUnique({ where: { userId: creatorId } });
    if (!balance || balance.autoWithdrawThresholdUsdc == null) return;

    const threshold = new Prisma.Decimal(balance.autoWithdrawThresholdUsdc);
    const current = new Prisma.Decimal(balance.amountUsdc);
    if (current.lt(threshold) || current.lt(MIN_WITHDRAW)) return;

    // Atomic flush: zero the balance and write a pending ledger row in one
    // tx. If two concurrent ticks both pass the check above, only one
    // succeeds in zeroing because the second sees the row already at 0.
    let pendingTxId: number;
    let amount: Prisma.Decimal;
    try {
      const res = await db.$transaction(async (tx) => {
        const fresh = await tx.balance.findUnique({ where: { userId: creatorId } });
        if (!fresh || new Prisma.Decimal(fresh.amountUsdc).lt(MIN_WITHDRAW)) {
          return null;
        }
        const amt = new Prisma.Decimal(fresh.amountUsdc);
        await tx.balance.update({
          where: { userId: creatorId },
          data: { amountUsdc: new Prisma.Decimal(0) },
        });
        const ledger = await tx.balanceTransaction.create({
          data: {
            userId: creatorId,
            type: "withdraw",
            amountUsdc: amt.neg(),
            referenceId: `auto-withdraw:pending`,
          },
        });
        return { id: ledger.id, amt };
      });
      if (!res) return;
      pendingTxId = res.id;
      amount = res.amt;
    } catch (e) {
      console.error(`[auto-withdraw] reserve failed for creator ${creatorId}:`, e);
      return;
    }

    let mintTxHash: string;
    try {
      const result = await getGatewayClient().withdraw(amount.toFixed(6), {
        recipient: recipient as `0x${string}`,
      });
      mintTxHash = result.mintTxHash;
    } catch (e) {
      // Refund: credit the balance back, mark the pending row as failed so
      // the creator can see in the dashboard exactly why their cashout
      // didn't go through.
      const rawMsg = e instanceof Error ? e.message : String(e);
      // referenceId is varchar(280)-ish via Prisma default; truncate the
      // error so we never blow the column limit.
      const reason = rawMsg.replace(/\s+/g, " ").slice(0, 220);
      console.error(`[auto-withdraw] gateway withdraw failed for creator ${creatorId}:`, e);
      // Engage cooldown + reset client before refunding so the next tick won't
      // immediately retry with the same (possibly corrupted) nonce state.
      failCooldown.set(creatorId, Date.now());
      resetGatewayClient();
      try {
        await db.$transaction([
          db.balance.update({
            where: { userId: creatorId },
            data: { amountUsdc: { increment: amount } },
          }),
          db.balanceTransaction.update({
            where: { id: pendingTxId },
            data: { referenceId: `auto-withdraw:failed:${reason}` },
          }),
        ]);
      } catch (refundErr) {
        console.error(`[auto-withdraw] refund failed for creator ${creatorId}, manual repair needed:`, refundErr);
      }
      return;
    }

    try {
      await db.balanceTransaction.update({
        where: { id: pendingTxId },
        data: { referenceId: `auto-withdraw:onchain:${mintTxHash}` },
      });
    } catch (e) {
      console.error(`[auto-withdraw] success bookkeeping failed for creator ${creatorId} tx ${mintTxHash}:`, e);
    }

    console.log(
      `[auto-withdraw] creator=${creatorId} amount=${amount.toString()} → ${recipient} tx=${arcExplorerTx(mintTxHash)}`,
    );
  } catch (e) {
    console.error(`[auto-withdraw] unexpected error for creator ${creatorId}:`, e);
  }
}
