import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { normalizeUrl } from "@/lib/url";

const postSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(200).optional(),
});

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const items = await db.contentUrl.findMany({
    where: { creatorId: uid },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sessions: true, consumption: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    items: items.map((c) => ({
      id: c.id,
      kind: c.kind,
      rawUrl: c.rawUrl,
      normalizedUrl: c.normalizedUrl,
      title: c.title,
      createdAt: c.createdAt,
      sessions: c._count.sessions,
      viewers: c._count.consumption,
    })),
  });
}

export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  let normalized: string;
  let kind: "youtube" | "web";
  try {
    ({ normalized, kind } = normalizeUrl(parsed.data.url));
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const existing = await db.contentUrl.findUnique({ where: { normalizedUrl: normalized } });
  if (existing) {
    if (existing.creatorId !== uid) {
      return NextResponse.json({ error: "url_already_registered" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, content: existing });
  }

  const content = await db.contentUrl.create({
    data: {
      creatorId: uid,
      kind,
      rawUrl: parsed.data.url,
      normalizedUrl: normalized,
      title: parsed.data.title ?? null,
    },
  });

  return NextResponse.json({ ok: true, content });
}
