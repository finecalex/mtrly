import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";

const schema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const session = await db.viewSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  if (session.viewerId !== uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    tickCount: session.tickCount,
    totalSpent: session.totalSpent.toString(),
  });
}
