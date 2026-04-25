import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { isValidSlug, uniqueSlugFor } from "@/lib/profile";

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      slug: true,
      avatarUrl: true,
      bio: true,
      walletAddress: true,
      circleWalletAddr: true,
      ownedEoaAddress: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, user });
}

const putSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  slug: z.string().min(3).max(32).optional(),
  avatarUrl: z.string().url().refine((s) => s.startsWith("https://"), "must_be_https").nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  role: z.enum(["viewer", "creator"]).optional(),
});

export async function PUT(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName;
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;

  if (parsed.data.slug !== undefined) {
    const wanted = parsed.data.slug.toLowerCase();
    if (!isValidSlug(wanted)) {
      return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
    }
    const taken = await db.user.findUnique({ where: { slug: wanted }, select: { id: true } });
    if (taken && taken.id !== uid) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    data.slug = wanted;
  }

  const updated = await db.user.update({
    where: { id: uid },
    data,
    select: {
      id: true, email: true, displayName: true, role: true,
      slug: true, avatarUrl: true, bio: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
