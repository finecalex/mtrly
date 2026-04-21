import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { applyTick } from "@/lib/billing";

const schema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const result = await applyTick({ viewerId: uid, sessionId: parsed.data.sessionId });

  if (!result.ok && result.reason === "insufficient") {
    return NextResponse.json({ ok: false, reason: "insufficient" }, { status: 402 });
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 });
  }

  return NextResponse.json(result);
}
