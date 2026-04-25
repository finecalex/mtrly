import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { gatewayConfigured, getGatewayClient } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  const [
    paymentAgg,
    tickAgg,
    tipAgg,
    onchainCount,
    creatorCount,
    contentCount,
    viewerCount,
    sessionCount,
    consumptionCount,
    last24hAgg,
  ] = await Promise.all([
    db.payment.aggregate({ _sum: { amountUsdc: true }, _count: { _all: true } }),
    db.payment.aggregate({ where: { kind: "tick" }, _sum: { amountUsdc: true }, _count: { _all: true } }),
    db.payment.aggregate({ where: { kind: "tip" }, _sum: { amountUsdc: true }, _count: { _all: true } }),
    db.payment.count({ where: { settledOnchain: true } }),
    db.user.count({ where: { role: "creator" } }),
    db.contentUrl.count(),
    db.user.count(),
    db.viewSession.count(),
    db.consumption.count(),
    db.payment.aggregate({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      _sum: { amountUsdc: true },
      _count: { _all: true },
    }),
  ]);

  let gateway: null | {
    address: string;
    completed: number;
    completedTotalUsdc: string;
    available: string;
    explorerUrl: string;
  } = null;
  if (gatewayConfigured()) {
    try {
      const c = getGatewayClient();
      const balances = await c.getBalances();
      const transfers = await c.searchTransfers({ status: "completed", from: c.address, pageSize: 100 });
      const completedTotalBase = transfers.transfers.reduce(
        (acc: bigint, t: { amount: { toString: () => string } }) => acc + BigInt(t.amount.toString()),
        0n,
      );
      gateway = {
        address: c.address,
        completed: transfers.transfers.length,
        completedTotalUsdc: (Number(completedTotalBase) / 1_000_000).toFixed(6),
        available: balances.gateway.formattedAvailable,
        explorerUrl: `https://testnet.arcscan.app/address/${c.address}`,
      };
    } catch (e) {
      // ignore, gateway optional
    }
  }

  return NextResponse.json({
    ok: true,
    totals: {
      payments: paymentAgg._count._all,
      volumeUsdc: (paymentAgg._sum.amountUsdc ?? new Prisma.Decimal(0)).toString(),
      ticks: tickAgg._count._all,
      ticksVolumeUsdc: (tickAgg._sum.amountUsdc ?? new Prisma.Decimal(0)).toString(),
      tips: tipAgg._count._all,
      tipsVolumeUsdc: (tipAgg._sum.amountUsdc ?? new Prisma.Decimal(0)).toString(),
      onchainSettled: onchainCount,
      creators: creatorCount,
      content: contentCount,
      users: viewerCount,
      sessions: sessionCount,
      consumption: consumptionCount,
    },
    last24h: {
      payments: last24hAgg._count._all,
      volumeUsdc: (last24hAgg._sum.amountUsdc ?? new Prisma.Decimal(0)).toString(),
    },
    gateway,
  });
}
