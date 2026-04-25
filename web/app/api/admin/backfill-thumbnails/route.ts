import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { previewImageForUrl } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const items = await db.contentUrl.findMany({
    where: { previewImageUrl: null },
    select: { id: true, rawUrl: true },
  });
  let updated = 0;
  for (const c of items) {
    const preview = previewImageForUrl(c.rawUrl);
    if (preview) {
      await db.contentUrl.update({
        where: { id: c.id },
        data: { previewImageUrl: preview },
      });
      updated++;
    }
  }
  return NextResponse.json({ ok: true, scanned: items.length, updated });
}
