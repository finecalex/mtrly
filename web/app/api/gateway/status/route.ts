import { NextResponse } from "next/server";
import { gatewayConfigured, gatewayStatus, arcExplorerTx, getGatewayClient } from "@/lib/gateway";

type TransferRow = {
  id: string;
  amount: string;
  amountBaseUnits: string;
  status: string;
  fromAddress: string;
  toAddress: string;
  createdAt: string;
  explorerUrl?: string;
};

const STATUSES = ["received", "batched", "confirmed", "completed", "failed"] as const;

function mapTransfer(t: any): TransferRow {
  const raw = t as Record<string, unknown>;
  const txHash = raw.transactionHash ?? raw.txHash;
  const baseUnits = t.amount;
  const asDollars = (Number(baseUnits) / 1_000_000).toFixed(6);
  return {
    id: t.id,
    amount: asDollars,
    amountBaseUnits: String(baseUnits),
    status: t.status,
    fromAddress: t.fromAddress,
    toAddress: t.toAddress,
    createdAt: t.createdAt,
    explorerUrl: typeof txHash === "string" ? arcExplorerTx(txHash) : undefined,
  };
}

export async function GET() {
  if (!gatewayConfigured()) {
    return NextResponse.json({ ok: false, error: "gateway_not_configured" }, { status: 503 });
  }
  try {
    const status = await gatewayStatus();
    const client = getGatewayClient();

    const perStatus = await Promise.all(
      STATUSES.map(async (s) => {
        try {
          const res = await client.searchTransfers({ from: client.address, status: s, pageSize: 100 });
          return { status: s, rows: (res.transfers ?? []) as any[] };
        } catch {
          return { status: s, rows: [] as any[] };
        }
      }),
    );

    const counts: Record<string, number> = {};
    const latestPerStatus: Record<string, TransferRow | null> = {};
    const allRows: any[] = [];
    for (const { status: s, rows } of perStatus) {
      counts[s] = rows.length;
      latestPerStatus[s] = rows[0] ? mapTransfer(rows[0]) : null;
      allRows.push(...rows);
    }

    allRows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const transfers = allRows.slice(0, 25).map(mapTransfer);

    return NextResponse.json({
      ok: true,
      ...status,
      transfers,
      counts,
      latestByStatus: latestPerStatus,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
