import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { provisionLocalEoa, userWalletConfigured } from "@/lib/userWallet";
import { provisionUserWallet } from "@/lib/wallet";
import { isValidSlug, uniqueSlugFor } from "@/lib/profile";
import { gatewayConfigured, getGatewayClient } from "@/lib/gateway";
import { normalizeUrl } from "@/lib/url";

// Admin-gated demo seeder. Pass in a list of demo creators with their own
// curated YouTube URL list — endpoint creates each creator (skipping any that
// already exist by slug), provisions wallets, optionally seeds a tiny on-chain
// USDC balance to their EOA so they show up on arcscan, then registers each
// URL as a ContentUrl under that creator.
//
// Usage:
//   curl -X POST -H 'x-admin-setup-key: $KEY' -H 'content-type: application/json' \
//     -d '{ "creators": [{"name": "Tech Bites", "slug": "tech-bites", "bio": "...",
//                          "urls": ["https://www.youtube.com/watch?v=...", "..."]}] }' \
//     /api/admin/seed-creators
//
// The seeder uses the actual creator's name only — never a real-person name
// (no "MrBeast", no "MKBHD"). Registering a real YouTube URL is fine (sharing
// a public link is the intended use), but presenting it as if a real public
// figure endorsed Mtrly is not. Generic names like "Tech Bites" make clear
// these are demo seed accounts curating popular educational content.

const SEED_PASSWORD_PREFIX = "demo-creator-seed";
const ONCHAIN_SEED_USDC = "0.10";

const creatorSchema = z.object({
  name: z.string().min(2).max(64),
  slug: z.string().min(3).max(32).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  // Allow empty so the seeder can stand up creator profiles first and the
  // URLs get attached in a second pass once the curator has picked them.
  urls: z.array(z.string().url()).max(10).default([]),
});

const schema = z.object({
  creators: z.array(creatorSchema).min(1).max(10),
  seedOnchain: z.boolean().optional().default(true),
});

function authorized(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-setup-key");
  return !!key && key === process.env.ADMIN_SETUP_KEY;
}

function ytId(url: string): string | null {
  const m = url.match(/[?&]v=([\w-]{6,})/);
  return m ? m[1] : null;
}

function emailFor(slug: string): string {
  return `${slug}@mtrly.demo`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const platform = gatewayConfigured() ? getGatewayClient() : null;

  const results: Array<{
    name: string;
    slug: string;
    userId: number;
    eoa: string | null;
    onchainSeed: { depositTxHash?: string; approvalTxHash?: string; explorerUrl?: string } | null;
    contentRegistered: Array<{ id: number; url: string; title: string }>;
    skippedUrls: Array<{ url: string; reason: string }>;
  }> = [];

  for (const c of parsed.data.creators) {
    const desiredSlug = (c.slug ?? c.name).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
    const validBase = isValidSlug(desiredSlug) ? desiredSlug : `creator-${Date.now().toString(36)}`;

    // Reuse existing user by slug if present, otherwise create.
    let user = await db.user.findUnique({ where: { slug: validBase } });
    if (!user) {
      const slug = await uniqueSlugFor(0, validBase);
      const passwordHash = await hashPassword(`${SEED_PASSWORD_PREFIX}-${slug}-${Math.random().toString(36).slice(2)}`);
      user = await db.user.create({
        data: {
          email: emailFor(slug),
          passwordHash,
          displayName: c.name,
          role: "creator",
          slug,
          bio: c.bio ?? null,
          avatarUrl: c.avatarUrl ?? null,
          balance: { create: { amountUsdc: new Prisma.Decimal(0) } },
        },
      });
    }

    // Make sure they have an EOA so arcscan deep-link works.
    let eoa: string | null = user.ownedEoaAddress;
    if (!eoa && userWalletConfigured()) {
      try {
        const provisioned = await provisionLocalEoa(user.id);
        eoa = provisioned.address;
      } catch (e) {
        console.error(`[seed-creators] EOA provisioning failed for ${user.slug}:`, e);
      }
    }
    if (!user.circleWalletId) {
      try {
        await provisionUserWallet(user.id);
      } catch (e) {
        console.error(`[seed-creators] Circle wallet provisioning failed for ${user.slug}:`, e);
      }
    }

    // Optional small on-chain seed so the creator's arcscan address shows real
    // activity from day one (judges click through and see something).
    let onchainSeed: { depositTxHash?: string; approvalTxHash?: string; explorerUrl?: string } | null = null;
    if (parsed.data.seedOnchain && platform && eoa) {
      try {
        const res = await platform.depositFor(ONCHAIN_SEED_USDC, eoa as `0x${string}`);
        onchainSeed = {
          depositTxHash: res.depositTxHash ?? undefined,
          approvalTxHash: res.approvalTxHash ?? undefined,
          explorerUrl: res.depositTxHash ? `https://testnet.arcscan.app/tx/${res.depositTxHash}` : undefined,
        };
      } catch (e) {
        console.error(`[seed-creators] depositFor failed for ${user.slug}:`, e);
      }
    }

    const contentRegistered: Array<{ id: number; url: string; title: string }> = [];
    const skippedUrls: Array<{ url: string; reason: string }> = [];

    for (const rawUrl of c.urls) {
      let normalized: string;
      let kind: "youtube" | "web";
      try {
        ({ normalized, kind } = normalizeUrl(rawUrl));
      } catch {
        skippedUrls.push({ url: rawUrl, reason: "invalid_url" });
        continue;
      }
      const exists = await db.contentUrl.findUnique({ where: { normalizedUrl: normalized } });
      if (exists) {
        skippedUrls.push({ url: rawUrl, reason: `already_registered_as_id_${exists.id}` });
        continue;
      }
      const id = ytId(rawUrl);
      const previewImageUrl = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
      const created = await db.contentUrl.create({
        data: {
          creatorId: user.id,
          kind,
          rawUrl,
          normalizedUrl: normalized,
          // Title will be empty until the creator (or another admin call) sets
          // it — the UI shows "Untitled" until that happens.
          title: null,
          previewImageUrl,
        },
      });
      contentRegistered.push({ id: created.id, url: rawUrl, title: created.title ?? "(untitled)" });
    }

    results.push({
      name: c.name,
      slug: user.slug ?? validBase,
      userId: user.id,
      eoa,
      onchainSeed,
      contentRegistered,
      skippedUrls,
    });
  }

  return NextResponse.json({ ok: true, results });
}
