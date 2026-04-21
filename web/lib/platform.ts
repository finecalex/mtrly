import { db } from "./db";
import { hashPassword } from "./auth";

const PLATFORM_EMAIL = "platform@mtrly.local";

let cachedId: number | null = null;

export async function getPlatformUserId(): Promise<number> {
  if (cachedId) return cachedId;

  const existing = await db.user.findUnique({ where: { email: PLATFORM_EMAIL } });
  if (existing) {
    cachedId = existing.id;
    return existing.id;
  }

  const passwordHash = await hashPassword(crypto.randomUUID() + crypto.randomUUID());
  const created = await db.user.create({
    data: {
      email: PLATFORM_EMAIL,
      passwordHash,
      displayName: "Mtrly Platform",
      role: "creator",
      balance: { create: { amountUsdc: 0 } },
    },
  });

  cachedId = created.id;
  return created.id;
}
