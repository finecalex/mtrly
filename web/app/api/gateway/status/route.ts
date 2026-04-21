import { NextResponse } from "next/server";
import { gatewayConfigured, gatewayStatus, arcExplorerTx, getGatewayClient } from "@/lib/gateway";

export async function GET() {
  if (!gatewayConfigured()) {
    return NextResponse.json({ ok: false, error: "gateway_not_configured" }, { status: 503 });
  }
  try {
    const status = await gatewayStatus();
    const client = getGatewayClient();
    let transfers: Array<{ id: string; amount: string; status: string; fromAddress: string; toAddress: string; createdAt: string; explorerUrl?: string }> = [];
    try {
      const res = await client.searchTransfers({ from: client.address, pageSize: 25 });
      transfers = (res.transfers ?? []).map((t) => {
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
      });
    } catch {
      transfers = [];
    }
    return NextResponse.json({ ok: true, ...status, transfers });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
