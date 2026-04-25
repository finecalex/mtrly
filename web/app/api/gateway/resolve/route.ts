import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGatewayClient, gatewayConfigured } from "@/lib/gateway";

export const dynamic = "force-dynamic";

type RawTransfer = Record<string, unknown> & {
  id?: string;
  transactionHash?: string;
  txHash?: string;
};

function extractHash(t: RawTransfer | null | undefined): string | null {
  if (!t) return null;
  for (const key of ["transactionHash", "txHash", "transaction_hash", "tx_hash"] as const) {
    const v = (t as Record<string, unknown>)[key];
    if (typeof v === "string" && v.startsWith("0x")) return v;
  }
  return null;
}

// Same resolution logic the background poller runs every 5s, exposed as a
// manual endpoint for ops/admin and for the dashboard's "refresh" path.
export async function POST() {
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }
  const pending = await db.payment.findMany({
    where: { nanopaymentTxId: { not: null }, onchainTxHash: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, nanopaymentTxId: true, settledOnchain: true },
  });
  if (pending.length === 0) {
    return NextResponse.json({ ok: true, resolved: 0, flagged: 0, pending: 0 });
  }
  const client = getGatewayClient();

  const hashByUuid = new Map<string, string>();
  try {
    const completed = await client.searchTransfers({
      from: client.address,
      status: "completed",
      pageSize: 100,
    });
    for (const t of (completed.transfers ?? []) as RawTransfer[]) {
      const id = typeof t.id === "string" ? t.id : null;
      const hash = extractHash(t);
      if (id && hash) hashByUuid.set(id, hash);
    }
  } catch {
    // fall back to per-payment lookup
  }

  let resolved = 0;
  let flagged = 0;
  for (const p of pending) {
    if (!p.nanopaymentTxId) continue;
    let hash = hashByUuid.get(p.nanopaymentTxId) ?? null;
    if (!hash) {
      try {
        const t = (await client.getTransferById(p.nanopaymentTxId)) as RawTransfer;
        hash = extractHash(t);
      } catch {
        // skip
      }
    }
    if (hash) {
      await db.payment.update({
        where: { id: p.id },
        data: { onchainTxHash: hash, settledOnchain: true },
      });
      resolved++;
    } else if (!p.settledOnchain) {
      await db.payment.update({
        where: { id: p.id },
        data: { settledOnchain: true },
      });
      flagged++;
    }
  }
  return NextResponse.json({ ok: true, resolved, flagged, pending: pending.length });
}
