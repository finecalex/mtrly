import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";

const schema = z.object({
  contentId: z.number().int().positive().optional(),
  normalizedUrl: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || (!parsed.data.contentId && !parsed.data.normalizedUrl)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const content = parsed.data.contentId
    ? await db.contentUrl.findUnique({ where: { id: parsed.data.contentId } })
    : await db.contentUrl.findUnique({ where: { normalizedUrl: parsed.data.normalizedUrl! } });

  if (!content) return NextResponse.json({ error: "content_not_found" }, { status: 404 });
  if (content.creatorId === uid) {
    return NextResponse.json({ error: "own_content" }, { status: 400 });
  }

  const session = await db.viewSession.create({
    data: {
      viewerId: uid,
      contentId: content.id,
    },
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    contentId: content.id,
    kind: content.kind,
  });
}
