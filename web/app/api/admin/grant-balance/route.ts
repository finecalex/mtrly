import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.string().email().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  amountUsdc: z.number().positive().max(1000),
  note: z.string().max(200).optional(),
}).refine((v) => v.email || v.walletAddress, {
  message: "email_or_walletAddress_required",
});

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-setup-key");
  if (!key || key !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { email, walletAddress, amountUsdc, note } = parsed.data;
  const amount = new Prisma.Decimal(amountUsdc.toFixed(8));

  const user = email
    ? await db.user.findUnique({ where: { email } })
    : await db.user.findFirst({
        where: {
          OR: [
            { circleWalletAddr: { equals: walletAddress, mode: "insensitive" } },
            { walletAddress: { equals: walletAddress, mode: "insensitive" } },
          ],
        },
      });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  await db.$transaction([
    db.balance.upsert({
      where: { userId: user.id },
      update: { amountUsdc: { increment: amount } },
      create: { userId: user.id, amountUsdc: amount },
    }),
    db.balanceTransaction.create({
      data: {
        userId: user.id,
        type: "deposit",
        amountUsdc: amount,
        referenceId: note ?? "admin-grant",
      },
    }),
  ]);

  const balance = await db.balance.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    ok: true,
    userId: user.id,
    email: user.email,
    credited: amount.toString(),
    balance: balance?.amountUsdc.toString() ?? "0",
  });
}
