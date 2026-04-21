import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyTick } from "@/lib/billing";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body.sessionId;
  const viewerEmail: string = body.viewerEmail ?? "demo-viewer@mtrly.local";
  const contentUrl: string = body.contentUrl ?? "/demo/article";

  let viewer = await db.user.findUnique({ where: { email: viewerEmail } });
  if (!viewer) {
    viewer = await db.user.create({
      data: { email: viewerEmail, passwordHash: "x", displayName: "Demo Viewer" },
    });
  }

  await db.balance.upsert({
    where: { userId: viewer.id },
    update: { amountUsdc: { increment: new Prisma.Decimal("0.10") } },
    create: { userId: viewer.id, amountUsdc: new Prisma.Decimal("0.10") },
  });

  let content = await db.contentUrl.findFirst({
    where: { normalizedUrl: contentUrl },
  });
  if (!content) {
    const firstCreator = await db.user.findFirst({ where: { role: "creator" } });
    if (!firstCreator) return NextResponse.json({ error: "no creator found" }, { status: 500 });
    content = await db.contentUrl.create({
      data: {
        creatorId: firstCreator.id,
        kind: "web",
        rawUrl: contentUrl,
        normalizedUrl: contentUrl,
        title: "E2E test article",
      },
    });
  }

  let sid = sessionId;
  if (!sid) {
    const session = await db.viewSession.create({
      data: { viewerId: viewer.id, contentId: content.id },
    });
    sid = session.id;
  }

  const result = await applyTick({ viewerId: viewer.id, sessionId: sid });

  await new Promise((r) => setTimeout(r, 4000));
  const payment = await db.payment.findFirst({
    where: { fromUserId: viewer.id },
    orderBy: { id: "desc" },
    select: {
      id: true,
      nanopaymentTxId: true,
      onchainTxHash: true,
      settledOnchain: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, sessionId: sid, tick: result, latestPayment: payment });
}
