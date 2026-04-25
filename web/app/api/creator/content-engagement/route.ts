import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { paragraphCount } from "@/lib/articleBody";

export const dynamic = "force-dynamic";

// Returns per-paragraph engagement metrics for a single article that the
// caller owns. Powers the "Engagement overview" card in the creator
// dashboard. Video kind isn't supported yet — UI shows a "coming soon"
// placeholder; for video we'd need per-second consumption tracking which
// the current ledger doesn't carry.
export async function GET(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const idStr = req.nextUrl.searchParams.get("contentId");
  const contentId = idStr ? parseInt(idStr, 10) : NaN;
  if (!Number.isFinite(contentId) || contentId <= 0) {
    return NextResponse.json({ error: "invalid_contentId" }, { status: 400 });
  }

  const content = await db.contentUrl.findUnique({
    where: { id: contentId },
    select: { id: true, kind: true, title: true, creatorId: true, bodyMarkdown: true },
  });
  if (!content) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (content.creatorId !== uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (content.kind !== "mtrly") {
    return NextResponse.json({
      ok: true,
      kind: content.kind,
      supported: false,
      reason: "engagement analytics for video / external URLs is not available yet",
    });
  }

  const totalParagraphs = paragraphCount(content.bodyMarkdown ?? "");
  if (totalParagraphs === 0) {
    return NextResponse.json({
      ok: true,
      kind: content.kind,
      supported: true,
      totalParagraphs: 0,
      totalViews: 0,
      avgEngagementPct: 0,
      dropoffParagraph: null,
      dropoffPct: 0,
      perParagraph: [],
    });
  }

  // Pull every viewer's units-consumed for this content. Even with thousands
  // of viewers per article this fits comfortably in one query because we
  // only need a single integer per row.
  const consumptions = await db.consumption.findMany({
    where: { contentId, viewerId: { not: content.creatorId } },
    select: { unitsConsumed: true },
  });
  const totalViews = consumptions.length;

  // Engagement % at paragraph i = share of viewers who reached paragraph i.
  // Paragraph 0 (free teaser) is implicit 100% — every visitor sees it. We
  // start the curve at index 1.
  const perParagraph: Array<{ idx: number; viewers: number; pct: number }> = [];
  for (let i = 0; i < totalParagraphs; i++) {
    if (i === 0) {
      perParagraph.push({ idx: 0, viewers: totalViews, pct: 100 });
      continue;
    }
    // Viewer "reached paragraph i" means they paid for at least i paragraphs
    // (unitsConsumed >= i). That's how the meter ledger encodes progress.
    const viewers = consumptions.filter((c) => c.unitsConsumed >= i).length;
    const pct = totalViews > 0 ? Math.round((viewers / totalViews) * 1000) / 10 : 0;
    perParagraph.push({ idx: i, viewers, pct });
  }

  // Average engagement % = average of (unitsConsumed / totalParagraphs).
  // Paragraph 0 is free, so we count it as paragraph "completed" for everyone.
  const avgEngagementPct = totalViews > 0
    ? Math.round(
        (consumptions.reduce((acc, c) => acc + Math.min(totalParagraphs, c.unitsConsumed + 1), 0)
          / (totalViews * totalParagraphs)) * 1000,
      ) / 10
    : 0;

  // Dropoff = paragraph index with the largest single-step engagement drop
  // versus the previous paragraph. UI highlights this as "X% of paragraph N".
  let dropoffParagraph: number | null = null;
  let dropoffMagnitude = 0;
  let dropoffPct = 0;
  for (let i = 1; i < perParagraph.length; i++) {
    const drop = perParagraph[i - 1].pct - perParagraph[i].pct;
    if (drop > dropoffMagnitude) {
      dropoffMagnitude = drop;
      dropoffParagraph = perParagraph[i].idx;
      dropoffPct = perParagraph[i].pct;
    }
  }

  return NextResponse.json({
    ok: true,
    kind: content.kind,
    supported: true,
    contentId: content.id,
    title: content.title,
    totalParagraphs,
    totalViews,
    avgEngagementPct,
    dropoffParagraph,
    dropoffPct,
    perParagraph,
  });
}
