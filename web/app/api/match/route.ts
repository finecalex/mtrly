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

  // Use the kind from the DB row, not the URL shape. Our own /a/[id] articles
  // are kind="mtrly" — the extension still wants to show its balance panel on
  // them but must skip the scroll-based paywall setup, since the page handles
  // tap-to-reveal metering itself. Returning kind="mtrly" lets extension
  // content.js branch on it explicitly.
  const effectiveKind: "youtube" | "web" | "mtrly" = content.kind;
  const price = effectiveKind === "youtube" ? PRICING.video.pricePerMinute : PRICING.text.pricePerParagraph;

  return NextResponse.json({
    match: true,
    contentId: content.id,
    kind: effectiveKind,
    pageManaged: effectiveKind === "mtrly",
    normalizedUrl: normalized,
    price,
    unit: effectiveKind === "youtube" ? "minute" : "paragraph",
    creator: content.creator,
  });
}
