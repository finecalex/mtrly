import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { normalizeUrl } from "@/lib/url";
import { previewImageForUrl } from "@/lib/youtube";

const postSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("url"),
    url: z.string().url(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(280).optional(),
    previewImageUrl: z.string().url().optional().nullable(),
  }),
  z.object({
    mode: z.literal("article"),
    title: z.string().min(1).max(200),
    description: z.string().max(280).optional(),
    body: z.string().min(20).max(50000),
    previewImageUrl: z.string().url().optional().nullable(),
  }),
]);

const patchSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional().nullable(),
  description: z.string().max(280).optional().nullable(),
  previewImageUrl: z.string().url().optional().nullable(),
  body: z.string().min(20).max(50000).optional().nullable(),
});

function publicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://circlearc-59513674.slonix.dev";
}

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
      bodyMarkdown: c.bodyMarkdown,
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
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.mode === "article") {
    const created = await db.contentUrl.create({
      data: {
        creatorId: uid,
        kind: "mtrly",
        rawUrl: "pending",
        normalizedUrl: `__pending__article__${uid}__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        previewImageUrl: parsed.data.previewImageUrl ?? null,
        bodyMarkdown: parsed.data.body,
      },
    });
    const canonical = `${publicAppUrl()}/a/${created.id}`;
    const updated = await db.contentUrl.update({
      where: { id: created.id },
      data: { rawUrl: canonical, normalizedUrl: canonical },
    });
    // Self-check: confirm the article is findable by /api/match so the extension
    // will meter it on first visit (kind=mtrly, pageManaged=true). Always true for
    // a newly created article — this is an explicit assertion, not a guard.
    const matchCheck = await db.contentUrl.findUnique({
      where: { normalizedUrl: canonical },
      select: { id: true, kind: true },
    });
    const metered = matchCheck?.id === created.id && matchCheck.kind === "mtrly";
    return NextResponse.json({ ok: true, content: updated, articleUrl: `/a/${created.id}`, metered });
  }

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
  if (parsed.data.body !== undefined && item.kind === "mtrly") data.bodyMarkdown = parsed.data.body;

  const updated = await db.contentUrl.update({
    where: { id: parsed.data.id },
    data,
  });
  return NextResponse.json({ ok: true, content: updated });
}

export async function DELETE(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const idParam = url.searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const item = await db.contentUrl.findUnique({ where: { id } });
  if (!item || item.creatorId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await db.contentUrl.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
