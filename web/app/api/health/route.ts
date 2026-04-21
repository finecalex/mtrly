import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "mtrly-web", version: "0.0.1" });
}
