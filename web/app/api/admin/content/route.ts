import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";

// Admin-gated content inspector + editor. GET returns full content rows
// (including rawUrl which the public /api/explore intentionally hides), PATCH
// updates a single row in place — preserving its id so all Payment / Session /
// Consumption rows tied to it stay attached.
function authorized(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-setup-key");
  return !!key && key === process.env.ADMIN_SETUP_KEY;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const items = await db.contentUrl.findMany({
    orderBy: { id: "asc" },
    include: { creator: { select: { id: true, slug: true, displayName: true } } },
  });
  return NextResponse.json({
    ok: true,
    items: items.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      description: i.description,
      rawUrl: i.rawUrl,
      normalizedUrl: i.normalizedUrl,
      previewImageUrl: i.previewImageUrl,
      creatorId: i.creatorId,
      creator: i.creator,
      createdAt: i.createdAt,
    })),
  });
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  url: z.string().url().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(280).nullable().optional(),
  previewImageUrl: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.previewImageUrl !== undefined) data.previewImageUrl = parsed.data.previewImageUrl;

  if (parsed.data.url !== undefined) {
    let normalized: string;
    let kind: "youtube" | "web";
    try {
      ({ normalized, kind } = normalizeUrl(parsed.data.url));
    } catch {
      return NextResponse.json({ error: "invalid_url" }, { status: 400 });
    }
    data.rawUrl = parsed.data.url;
    data.normalizedUrl = normalized;
    // Auto-derive YouTube thumbnail if a YouTube url and no explicit preview
    // was passed.
    if (kind === "youtube" && parsed.data.previewImageUrl === undefined) {
      const m = parsed.data.url.match(/[?&]v=([\w-]{6,})/);
      if (m) data.previewImageUrl = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
    }
  }

  const updated = await db.contentUrl.update({
    where: { id: parsed.data.id },
    data,
  });
  return NextResponse.json({ ok: true, content: updated });
}
