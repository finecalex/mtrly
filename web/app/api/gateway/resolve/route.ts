import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGatewayClient, gatewayConfigured } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }
  const pending = await db.payment.findMany({
    where: { nanopaymentTxId: { not: null }, onchainTxHash: null },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: { id: true, nanopaymentTxId: true },
  });
  if (pending.length === 0) {
    return NextResponse.json({ ok: true, resolved: 0, pending: 0 });
  }
  const client = getGatewayClient();
  let resolved = 0;
  for (const p of pending) {
    if (!p.nanopaymentTxId) continue;
    try {
      const t = (await client.getTransferById(p.nanopaymentTxId)) as Record<string, unknown>;
      const hash = (t.transactionHash ?? t.txHash) as string | undefined;
      if (typeof hash === "string" && hash.startsWith("0x")) {
        await db.payment.update({
          where: { id: p.id },
          data: { onchainTxHash: hash, settledOnchain: true },
        });
        resolved++;
      }
    } catch {
      // skip; try on next tick
    }
  }
  return NextResponse.json({ ok: true, resolved, pending: pending.length });
}
