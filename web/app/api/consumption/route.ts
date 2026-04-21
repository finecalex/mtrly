import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { normalizeUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "url required" }, { status: 400 });

  let normalized: string;
  try {
    ({ normalized } = normalizeUrl(raw));
  } catch {
    return NextResponse.json({ unitsConsumed: 0, isUnlocked: false });
  }

  const content = await db.contentUrl.findUnique({ where: { normalizedUrl: normalized } });
  if (!content) return NextResponse.json({ unitsConsumed: 0, isUnlocked: false });

  const consumption = await db.consumption.findUnique({
    where: { viewerId_contentId: { viewerId: uid, contentId: content.id } },
  });

  return NextResponse.json({
    unitsConsumed: consumption?.unitsConsumed ?? 0,
    totalPaidUsdc: consumption?.totalPaidUsdc.toString() ?? "0",
    isUnlocked: consumption?.isUnlocked ?? false,
    contentId: content.id,
  });
}
