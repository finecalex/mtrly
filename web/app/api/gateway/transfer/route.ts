import { NextRequest, NextResponse } from "next/server";
import { getGatewayClient, gatewayConfigured, arcExplorerTx } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id param" }, { status: 400 });
  try {
    const client = getGatewayClient();
    const t = await client.getTransferById(id);
    const extra = t as Record<string, unknown>;
    const txHash = (extra.transactionHash ?? extra.txHash) as string | undefined;
    return NextResponse.json({
      ok: true,
      transfer: t,
      transactionHash: txHash ?? null,
      explorerUrl: typeof txHash === "string" ? arcExplorerTx(txHash) : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
