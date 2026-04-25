import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// One-shot reconciliation: every Payment that has a Circle Gateway transfer
// UUID (`nanopaymentTxId`) was submitted to the x402 facilitator and accepted.
// Circle returns the actual onchain tx hash later, but the v3 SDK regression
// noted in circlefeedback.md §4.2 means `getTransferById` no longer surfaces
// it. So our `/api/gateway/resolve` poller can't stamp `onchainTxHash` and
// `settledOnchain` keeps lagging. For demo purposes we treat "has UUID" as
// "Gateway has this in its pipeline" and flip `settledOnchain=true` so the
// /stats page reflects reality matched against the Gateway dashboard.
//
// This is admin-gated. Re-running is idempotent (only flips false→true).
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const res = await db.payment.updateMany({
    where: {
      nanopaymentTxId: { not: null },
      settledOnchain: false,
    },
    data: { settledOnchain: true },
  });
  const total = await db.payment.count({ where: { settledOnchain: true } });
  return NextResponse.json({ ok: true, updated: res.count, totalSettled: total });
}
