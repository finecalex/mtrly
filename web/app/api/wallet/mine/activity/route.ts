import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { arcExplorerTx, platformGatewayExplorerUrl } from "@/lib/gateway";

export const dynamic = "force-dynamic";

// Returns the current user's most recent outgoing payments (ticks + tips)
// in a compact shape for the extension popup. Each row includes an arcscan
// link — direct tx hash if we have it, otherwise the platform Gateway
// address scoped to the batch settlement (still onchain proof, just one
// hop coarser).
export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: uid },
    select: { ownedEoaAddress: true, circleWalletAddr: true },
  });

  const platformExplorer = platformGatewayExplorerUrl();
  const userExplorer = user?.ownedEoaAddress
    ? `https://testnet.arcscan.app/address/${user.ownedEoaAddress}`
    : null;

  const recent = await db.payment.findMany({
    where: { fromUserId: uid },
    orderBy: { id: "desc" },
    take: 8,
    select: {
      id: true,
      amountUsdc: true,
      kind: true,
      createdAt: true,
      onchainTxHash: true,
      nanopaymentTxId: true,
      settledOnchain: true,
      content: { select: { title: true, kind: true, normalizedUrl: true } },
      toUser: { select: { displayName: true, slug: true } },
    },
  });

  const totals = await db.payment.aggregate({
    where: { fromUserId: uid },
    _sum: { amountUsdc: true },
    _count: { _all: true },
  });
  const onchainCount = await db.payment.count({
    where: { fromUserId: uid, settledOnchain: true },
  });

  return NextResponse.json({
    ok: true,
    address: user?.ownedEoaAddress ?? null,
    explorerUrl: userExplorer,
    platformExplorerUrl: platformExplorer,
    totals: {
      payments: totals._count,
      onchainSettled: onchainCount,
      volumeUsdc: totals._sum.amountUsdc?.toString() ?? "0",
    },
    items: recent.map((p) => ({
      id: p.id,
      amountUsdc: p.amountUsdc.toString(),
      kind: p.kind,
      createdAt: p.createdAt,
      title: p.content?.title ?? p.content?.normalizedUrl ?? null,
      contentKind: p.content?.kind ?? null,
      toName: p.toUser.displayName ?? p.toUser.slug ?? null,
      onchainTxHash: p.onchainTxHash,
      nanopaymentTxId: p.nanopaymentTxId,
      settledOnchain: p.settledOnchain,
      explorerUrl: p.onchainTxHash
        ? arcExplorerTx(p.onchainTxHash)
        : p.settledOnchain
          ? platformExplorer
          : null,
    })),
  });
}
