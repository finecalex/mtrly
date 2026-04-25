import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserGatewayClient } from "@/lib/userWallet";

// Admin probe: walk through the most recently active per-user EOAs and ask
// each one's GatewayClient what its current Gateway queue looks like (received
// / batched / confirmed / completed / failed). Lets us answer "is the Circle
// batcher actually moving anything for any of our users right now?" without
// having to add per-user counters everywhere.
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Pull the 12 most recently active users with EOAs that have made payments
  // (these are the ones whose Gateway queue is interesting).
  const users = await db.user.findMany({
    where: { ownedEoaAddress: { not: null } },
    orderBy: { id: "desc" },
    take: 12,
    select: {
      id: true,
      displayName: true,
      ownedEoaAddress: true,
      paymentsOut: { select: { id: true } },
    },
  });

  const results: Array<{
    userId: number;
    displayName: string | null;
    eoa: string | null;
    paymentsOut: number;
    counts?: Record<string, number>;
    error?: string;
  }> = [];

  for (const u of users) {
    if (!u.ownedEoaAddress) continue;
    try {
      const client = await getUserGatewayClient(u.id);
      if (!client) {
        results.push({
          userId: u.id,
          displayName: u.displayName,
          eoa: u.ownedEoaAddress,
          paymentsOut: u.paymentsOut.length,
          error: "no_client",
        });
        continue;
      }
      const counts: Record<string, number> = {};
      for (const status of ["received", "batched", "confirmed", "completed", "failed"] as const) {
        const r = await client.searchTransfers({ status, pageSize: 100 });
        counts[status] = r.transfers.length;
      }
      results.push({
        userId: u.id,
        displayName: u.displayName,
        eoa: u.ownedEoaAddress,
        paymentsOut: u.paymentsOut.length,
        counts,
      });
    } catch (e) {
      results.push({
        userId: u.id,
        displayName: u.displayName,
        eoa: u.ownedEoaAddress,
        paymentsOut: u.paymentsOut.length,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Aggregate
  const totals = { received: 0, batched: 0, confirmed: 0, completed: 0, failed: 0 };
  for (const r of results) {
    if (!r.counts) continue;
    for (const k of Object.keys(totals) as Array<keyof typeof totals>) {
      totals[k] += r.counts[k] ?? 0;
    }
  }

  return NextResponse.json({ ok: true, totals, perUser: results });
}
