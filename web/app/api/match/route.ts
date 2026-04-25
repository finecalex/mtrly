import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";
import { PRICING } from "@/lib/config";

// All domain aliases that point at this app. When a URL arrives via any of
// these we rewrite it to the canonical origin before the DB lookup so that
// articles created on one domain are matched when accessed via another.
const CANONICAL_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? "https://circlearc-59513674.slonix.dev").replace(/\/$/, "");
const OWN_ORIGIN_ALIASES = new Set([
  CANONICAL_ORIGIN,
  "https://mtrly.xyz",
  "https://www.mtrly.xyz",
]);

function canonicalize(url: string): string {
  try {
    const u = new URL(url);
    if (OWN_ORIGIN_ALIASES.has(u.origin)) {
      return `${CANONICAL_ORIGIN}${u.pathname}${u.search}`;
    }
  } catch { /* not a valid URL — leave as-is */ }
  return url;
}

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

  // Rewrite own-domain aliases to canonical so mtrly.xyz/a/10 finds the same
  // DB row as circlearc-59513674.slonix.dev/a/10.
  const lookupUrl = canonicalize(normalized);

  const content = await db.contentUrl.findUnique({
    where: { normalizedUrl: lookupUrl },
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
