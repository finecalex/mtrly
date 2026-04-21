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
      const res = await client.searchTransfers({ from: client.address, pageSize: 10 });
      transfers = (res.transfers ?? []).map((t) => {
        const txHash = (t as Record<string, unknown>).transactionHash ?? (t as Record<string, unknown>).txHash;
        return {
          id: t.id,
          amount: t.amount,
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
