import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { normalizeUrl } from "@/lib/url";
import { previewImageForUrl } from "@/lib/youtube";

const postSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(280).optional(),
  previewImageUrl: z.string().url().optional().nullable(),
});

const patchSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional().nullable(),
  description: z.string().max(280).optional().nullable(),
  previewImageUrl: z.string().url().optional().nullable(),
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
      description: c.description,
      previewImageUrl: c.previewImageUrl,
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

  const autoPreview = parsed.data.previewImageUrl ?? previewImageForUrl(parsed.data.url);

  const content = await db.contentUrl.create({
    data: {
      creatorId: uid,
      kind,
      rawUrl: parsed.data.url,
      normalizedUrl: normalized,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      previewImageUrl: autoPreview,
    },
  });

  return NextResponse.json({ ok: true, content });
}

export async function PATCH(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const item = await db.contentUrl.findUnique({ where: { id: parsed.data.id } });
  if (!item || item.creatorId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.previewImageUrl !== undefined) data.previewImageUrl = parsed.data.previewImageUrl;

  const updated = await db.contentUrl.update({
    where: { id: parsed.data.id },
    data,
  });
  return NextResponse.json({ ok: true, content: updated });
}
