import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gatewayConfigured, getGatewayClient } from "@/lib/gateway";

// Heavy reconciliation pass — pulls every "completed" Gateway transfer from
// the platform pool and tries to back-fill the real onchain tx hash on every
// Payment row whose nanopaymentTxId matches. For payments where Circle's
// SDK still hides the hash (v3 regression, see circlefeedback.md §4.2) we
// fall back to flipping settledOnchain=true so the UI stops showing them as
// "batching…" forever — the platform Gateway address is the audit anchor.
//
// Admin-gated. Idempotent: only flips false→true and only writes a hash if
// it wasn't already set.
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

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let hashesWritten = 0;
  if (gatewayConfigured()) {
    const client = getGatewayClient();
    const hashByUuid = new Map<string, string>();
    // Walk a few pages to cover historical batches.
    for (let page = 1; page <= 5; page++) {
      try {
        const completed = await client.searchTransfers({
          from: client.address,
          status: "completed",
          pageSize: 100,
        });
        const rows = (completed.transfers ?? []) as RawTransfer[];
        if (rows.length === 0) break;
        for (const t of rows) {
          const id = typeof t.id === "string" ? t.id : null;
          const hash = extractHash(t);
          if (id && hash) hashByUuid.set(id, hash);
        }
        if (rows.length < 100) break;
      } catch {
        break;
      }
    }

    if (hashByUuid.size > 0) {
      const candidates = await db.payment.findMany({
        where: {
          nanopaymentTxId: { in: Array.from(hashByUuid.keys()) },
          onchainTxHash: null,
        },
        select: { id: true, nanopaymentTxId: true },
      });
      for (const p of candidates) {
        if (!p.nanopaymentTxId) continue;
        const hash = hashByUuid.get(p.nanopaymentTxId);
        if (!hash) continue;
        await db.payment.update({
          where: { id: p.id },
          data: { onchainTxHash: hash, settledOnchain: true },
        });
        hashesWritten++;
      }
    }
  }

  // Anything still without a hash but with a UUID: flip the flag so the UI
  // can fall back to the platform-address arcscan link instead of stalling.
  const flag = await db.payment.updateMany({
    where: {
      nanopaymentTxId: { not: null },
      settledOnchain: false,
    },
    data: { settledOnchain: true },
  });

  const totalSettled = await db.payment.count({ where: { settledOnchain: true } });
  const totalWithHash = await db.payment.count({ where: { onchainTxHash: { not: null } } });

  return NextResponse.json({
    ok: true,
    hashesWritten,
    flagsFlipped: flag.count,
    totalSettled,
    totalWithHash,
  });
}
