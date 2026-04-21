import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gatewayConfigured, gatewayWithdraw, arcExplorerTx } from "@/lib/gateway";

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
    const res = await gatewayWithdraw(parsed.data.amountUsdc);
    return NextResponse.json({
      ok: true,
      ...res,
      explorer: { mint: arcExplorerTx(res.mintTxHash) },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
