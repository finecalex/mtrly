import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.payment.findMany({
    orderBy: { id: "desc" },
    take: 20,
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      amountUsdc: true,
      nanopaymentTxId: true,
      onchainTxHash: true,
      settledOnchain: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    ok: true,
    count: rows.length,
    rows: rows.map((r) => ({
      ...r,
      amountUsdc: r.amountUsdc.toString(),
      explorerUrl: r.onchainTxHash ? `https://testnet.arcscan.app/tx/${r.onchainTxHash}` : null,
    })),
  });
}
