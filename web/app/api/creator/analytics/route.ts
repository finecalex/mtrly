import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.max(7, Math.min(parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 90));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const rows = await db.payment.findMany({
    where: { toUserId: uid, createdAt: { gte: since } },
    select: { amountUsdc: true, createdAt: true, kind: true, settledOnchain: true },
  });

  const byDay = new Map<
    string,
    { date: string; tickUsdc: Prisma.Decimal; tipUsdc: Prisma.Decimal; payments: number; onchain: number }
  >();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, {
      date: key,
      tickUsdc: new Prisma.Decimal(0),
      tipUsdc: new Prisma.Decimal(0),
      payments: 0,
      onchain: 0,
    });
  }

  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    if (r.kind === "tip") bucket.tipUsdc = bucket.tipUsdc.plus(r.amountUsdc);
    else bucket.tickUsdc = bucket.tickUsdc.plus(r.amountUsdc);
    bucket.payments++;
    if (r.settledOnchain) bucket.onchain++;
  }

  const series = Array.from(byDay.values()).map((b) => ({
    date: b.date,
    tickUsdc: b.tickUsdc.toString(),
    tipUsdc: b.tipUsdc.toString(),
    totalUsdc: b.tickUsdc.plus(b.tipUsdc).toString(),
    payments: b.payments,
    onchainSettled: b.onchain,
  }));

  const totals = {
    payments: rows.length,
    onchainSettled: rows.filter((r) => r.settledOnchain).length,
    tickUsdc: rows.filter((r) => r.kind === "tick").reduce((a, r) => a.plus(r.amountUsdc), new Prisma.Decimal(0)).toString(),
    tipUsdc: rows.filter((r) => r.kind === "tip").reduce((a, r) => a.plus(r.amountUsdc), new Prisma.Decimal(0)).toString(),
  };

  return NextResponse.json({ ok: true, days, totals, series });
}
