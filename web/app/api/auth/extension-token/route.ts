import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const token = cookies().get("mtrly_session")?.value ?? null;
  return NextResponse.json({ token });
}
