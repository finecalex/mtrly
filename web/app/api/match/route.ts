import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";
import { PRICING } from "@/lib/config";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ match: false, error: "url required" }, { status: 400 });

  let normalized: string;
  let kind: "youtube" | "web";
  try {
    ({ normalized, kind } = normalizeUrl(raw));
  } catch {
    return NextResponse.json({ match: false });
  }

  const content = await db.contentUrl.findUnique({
    where: { normalizedUrl: normalized },
    include: { creator: { select: { id: true, displayName: true, walletAddress: true } } },
  });

  if (!content) return NextResponse.json({ match: false });

  const price = kind === "youtube" ? PRICING.video.pricePerMinute : PRICING.text.pricePerParagraph;

  return NextResponse.json({
    match: true,
    contentId: content.id,
    kind,
    normalizedUrl: normalized,
    price,
    unit: kind === "youtube" ? "minute" : "paragraph",
    creator: content.creator,
  });
}
