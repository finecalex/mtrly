import { NextRequest, NextResponse } from "next/server";
import { gatewayConfigured, settleTickViaGateway } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const amountUsdc = typeof body.amountUsdc === "number" ? body.amountUsdc : 0.00416;
  try {
    const res = await settleTickViaGateway({ amountUsdc });
    return NextResponse.json({
      ok: true,
      ...res,
      explorerUrl: res.transaction ? `https://testnet.arcscan.app/tx/${res.transaction}` : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
