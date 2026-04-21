import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, issueToken, setSessionCookie } from "@/lib/auth";
import { provisionUserWallet } from "@/lib/wallet";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(64).optional(),
  role: z.enum(["viewer", "creator"]).default("viewer"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, displayName, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName ?? email.split("@")[0],
      role,
      balance: { create: { amountUsdc: 0 } },
    },
  });

  let walletAddress: string | null = null;
  try {
    const wallet = await provisionUserWallet(user.id);
    walletAddress = wallet.address;
  } catch (e) {
    console.error("[signup] wallet provisioning failed:", e);
  }

  const token = await issueToken(user.id);
  setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    walletAddress,
  });
}
