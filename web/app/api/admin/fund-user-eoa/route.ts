import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getGatewayClient, gatewayConfigured, arcExplorerTx } from "@/lib/gateway";

const schema = z
  .object({
    email: z.string().email().optional(),
    userId: z.number().int().positive().optional(),
    amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
    skipApprovalCheck: z.boolean().optional(),
  })
  .refine((v) => v.email || v.userId, { message: "email_or_userId_required" });

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!gatewayConfigured()) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { email, userId, amountUsdc, skipApprovalCheck } = parsed.data;
  const user = await db.user.findUnique({
    where: email ? { email } : { id: userId! },
    select: { id: true, email: true, ownedEoaAddress: true },
  });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  if (!user.ownedEoaAddress) {
    return NextResponse.json({ error: "user_has_no_local_eoa" }, { status: 400 });
  }

  try {
    const platform = getGatewayClient();
    const res = await platform.depositFor(
      amountUsdc,
      user.ownedEoaAddress as `0x${string}`,
      skipApprovalCheck ? { skipApprovalCheck: true } : undefined,
    );
    return NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
      depositor: res.depositor,
      amount: res.formattedAmount,
      depositTxHash: res.depositTxHash,
      approvalTxHash: res.approvalTxHash,
      explorerUrl: arcExplorerTx(res.depositTxHash),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/fund-user-eoa] depositFor failed:", msg);
    return NextResponse.json({ error: "deposit_failed", message: msg }, { status: 500 });
  }
}
