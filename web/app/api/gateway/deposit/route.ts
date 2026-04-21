import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gatewayConfigured, gatewayDeposit, arcExplorerTx } from "@/lib/gateway";

const schema = z.object({
  amountUsdc: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const res = await gatewayDeposit(parsed.data.amountUsdc);
    return NextResponse.json({
      ok: true,
      ...res,
      explorer: {
        deposit: arcExplorerTx(res.depositTxHash),
        approval: res.approvalTxHash ? arcExplorerTx(res.approvalTxHash) : undefined,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
