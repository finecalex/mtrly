import { NextRequest, NextResponse } from "next/server";
import { backfillSlugForAllUsers } from "@/lib/profile";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const updated = await backfillSlugForAllUsers();
  return NextResponse.json({ ok: true, updated });
}
