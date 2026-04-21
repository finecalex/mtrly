import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.payment.findMany({
    where: { nanopaymentTxId: { not: null } },
    orderBy: { id: "desc" },
    take: 25,
    select: {
      id: true,
      amountUsdc: true,
      createdAt: true,
      nanopaymentTxId: true,
      onchainTxHash: true,
      settledOnchain: true,
      content: { select: { title: true, normalizedUrl: true, kind: true } },
    },
  });

  const totalAgg = await db.payment.aggregate({
    where: { nanopaymentTxId: { not: null } },
    _sum: { amountUsdc: true },
    _count: true,
  });

  const confirmedAgg = await db.payment.count({
    where: { settledOnchain: true },
  });

  return NextResponse.json({
    totalOnchainTicks: totalAgg._count,
    totalConfirmed: confirmedAgg,
    totalVolumeUsdc: totalAgg._sum.amountUsdc?.toString() ?? "0",
    items: rows.map((p) => ({
      id: p.id,
      amountUsdc: p.amountUsdc.toString(),
      createdAt: p.createdAt,
      onchainTxHash: p.onchainTxHash,
      settledOnchain: p.settledOnchain,
      explorerUrl: p.onchainTxHash ? `https://testnet.arcscan.app/tx/${p.onchainTxHash}` : null,
      content: p.content ? { title: p.content.title, normalizedUrl: p.content.normalizedUrl, kind: p.content.kind } : null,
    })),
  });
}
