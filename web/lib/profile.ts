import { db } from "./db";

const RESERVED_SLUGS = new Set([
  "api", "auth", "admin", "dashboard", "balance", "explore", "leaderboard",
  "settings", "c", "demo", "login", "signup", "logout", "_next", "static",
  "extension", "wallet",
]);

export function slugFromEmail(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/^-+|-+$/g, "");
  const trimmed = base.slice(0, 32) || "user";
  return RESERVED_SLUGS.has(trimmed) ? `${trimmed}-1` : trimmed;
}

export function isValidSlug(s: string): boolean {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(s)) return false;
  if (RESERVED_SLUGS.has(s)) return false;
  return true;
}

export async function uniqueSlugFor(userId: number, base: string, attempts = 5): Promise<string> {
  let candidate = base;
  for (let i = 0; i < attempts; i++) {
    const existing = await db.user.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === userId) return candidate;
    candidate = `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
  }
  return `user-${userId}`;
}

export async function backfillSlugForAllUsers(): Promise<number> {
  const users = await db.user.findMany({
    where: { slug: null },
    select: { id: true, email: true },
  });
  let updated = 0;
  for (const u of users) {
    const base = slugFromEmail(u.email);
    const slug = await uniqueSlugFor(u.id, base);
    await db.user.update({ where: { id: u.id }, data: { slug } });
    updated++;
  }
  return updated;
}
