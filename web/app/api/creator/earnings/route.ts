import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { PRICING } from "@/lib/config";
import { arcExplorerTx, platformGatewayExplorerUrl } from "@/lib/gateway";

const SHARE = new Prisma.Decimal(PRICING.split.creator);

function scale(raw: string | null | undefined): string {
  if (!raw) return "0";
  return new Prisma.Decimal(raw).mul(SHARE).toFixed(8);
}

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [balance, totals, onchainSettled, recent, perContent] = await Promise.all([
    db.balance.findUnique({ where: { userId: uid } }),
    db.payment.aggregate({
      where: { toUserId: uid },
      _sum: { amountUsdc: true },
      _count: true,
    }),
    db.payment.count({
      where: { toUserId: uid, settledOnchain: true },
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

  // Recent auto-cashouts: BalanceTransaction rows of type=withdraw with our
  // auto-withdraw:* referenceId encode them. We pull EVERY status (pending,
  // onchain, failed-refunded) and let the UI render each appropriately —
  // otherwise stuck-pending or hash-less successful settles disappear from
  // the list and the creator can't see what's happening.
  const autoCashouts = await db.balanceTransaction.findMany({
    where: {
      userId: uid,
      type: "withdraw",
      referenceId: { startsWith: "auto-withdraw:" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, amountUsdc: true, referenceId: true, createdAt: true },
  });
  const autoWithdrawals = autoCashouts.map((r) => {
    const ref = r.referenceId ?? "";
    let status: "pending" | "onchain" | "failed" = "pending";
    let hash: string | null = null;
    if (ref.startsWith("auto-withdraw:onchain:")) {
      status = "onchain";
      const h = ref.slice("auto-withdraw:onchain:".length);
      hash = h && h.startsWith("0x") ? h : null;
    } else if (ref.startsWith("auto-withdraw:failed")) {
      status = "failed";
    }
    return {
      id: r.id,
      // amountUsdc is stored negative for withdraws — flip for the UI
      amountUsdc: new Prisma.Decimal(r.amountUsdc).neg().toString(),
      createdAt: r.createdAt,
      status,
      onchainTxHash: hash,
      explorerUrl: hash ? `https://testnet.arcscan.app/tx/${hash}` : null,
    };
  });

  return NextResponse.json({
    balanceUsdc: balance?.amountUsdc.toString() ?? "0",
    autoWithdrawThresholdUsdc: balance?.autoWithdrawThresholdUsdc?.toString() ?? null,
    lifetimeEarnedUsdc: scale(totals._sum.amountUsdc?.toString()),
    lifetimePaymentCount: totals._count,
    onchainSettledCount: onchainSettled,
    autoWithdrawals,
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
      nanopaymentTxId: p.nanopaymentTxId,
      onchainTxHash: p.onchainTxHash,
      settledOnchain: p.settledOnchain,
      explorerUrl: p.onchainTxHash
        ? arcExplorerTx(p.onchainTxHash)
        : p.settledOnchain
          ? platformGatewayExplorerUrl()
          : null,
    })),
  });
}
