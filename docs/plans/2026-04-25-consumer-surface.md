# Mtrly Consumer Surface — Patreon/Boosty-like UX

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Mtrly's pay-per-second flow legible to a non-developer in under 30 seconds — discovery, creator pages, leaderboard, onboarding, polished visuals — without losing the Circle/Arc onchain-proof story.

**Architecture:**
- Server: keep Next.js 14 app router + Prisma. Add 4 read-only endpoints (`/api/explore`, `/api/leaderboard`, `/api/creator/[slug]`, GET on `/api/profile`) + 1 mutating (`/api/profile` PUT). All pure SQL, no new infra.
- Client: install `shadcn/ui` + `lucide-react`. Replace dev-console aesthetic on consumer pages (home, /explore, /leaderboard, /c/[slug], /balance onboarding) with warmer, card-based layouts. Keep `/dashboard` slightly cleaner but still functional. Mono/console look is reserved for onchain-proof panels (signal: "this is actually onchain").
- Identity: add `slug`, `avatarUrl`, `bio` to `User` (slug auto-generated from email).
- Caching: revalidate explore/leaderboard every 30s (`export const revalidate = 30`).

**Tech Stack:** Next.js 14 (app router), Prisma + Postgres, Tailwind, shadcn/ui, lucide-react.

**Out of scope:** comments, follows, tiers, notifications, mobile-only refinement, real avatar uploads (URLs only — Boring Avatars fallback).

**Trade-off accepted:** Visual refresh applies to consumer pages (home, /explore, /leaderboard, /c/[slug], /settings, onboarding). `/dashboard` and `/balance` keep their current structure with shadcn primitives swapped in — full Boosty-style creator dashboard is too much for 2 days.

---

## Task 1: Schema — slug, avatarUrl, bio

**Files:**
- Modify: `web/prisma/schema.prisma` (User model)

**Step 1: Add fields**

```prisma
model User {
  ...
  slug              String?  @unique
  avatarUrl         String?
  bio               String?  @db.VarChar(500)
  ...
}
```

**Step 2: Backfill helper**

In `web/lib/profile.ts` (new):
```ts
export function slugFromEmail(email: string): string {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 32);
}
```

**Step 3: Hook signup** — in `web/app/api/auth/signup/route.ts`, set `slug: slugFromEmail(email)` on user create. Fall back to `slug-${userId}` if collision (catch + retry once).

**Step 4: One-shot backfill** — `web/scripts/backfill-slugs.ts` (or inline in container CMD): set slug for all existing users with null slug.

**Step 5: Rebuild + deploy** — schema migrates via `prisma db push` in container CMD.

**Step 6: Commit**
```
feat(profile): add slug+avatarUrl+bio to User, backfill from email
```

---

## Task 2: GET /api/profile + PUT /api/profile

**Files:**
- Create: `web/app/api/profile/route.ts`

**Endpoint:**
- `GET` — returns full profile of current user (id, email, displayName, slug, avatarUrl, bio, role, walletAddress, ownedEoaAddress).
- `PUT` — updates `displayName`, `slug` (validated: lowercase alphanumeric + hyphen, 3-32 chars, not "api"/"auth"/"dashboard"/"balance"/"explore"/"leaderboard"/"settings"/"c"/"demo"/"admin"), `avatarUrl` (must be https://), `bio` (max 500 chars).

**Auth:** `currentUserId()`.

**Step 1: Implement.**
**Step 2: Manual smoke** — `curl /api/profile -b cookies` then PUT.
**Step 3: Commit** — `feat(profile): GET/PUT /api/profile`.

---

## Task 3: GET /api/explore

**Files:**
- Create: `web/app/api/explore/route.ts`

**Returns:** list of `ContentUrl` joined to creator (with slug/avatar/displayName), with aggregates: `viewerCount`, `totalEarned`, `lifetimePayments`. Order: most recent first; optional `?sort=earnings|recent|trending` (trending = payments in last 7d).

**SQL approach:** one Prisma query with `_count` + groupBy on Payment for earnings. Cap to 50 items.

**Step 1: Implement.**
**Step 2: Smoke** — `curl /api/explore`.
**Step 3: Commit.**

---

## Task 4: GET /api/leaderboard

**Files:**
- Create: `web/app/api/leaderboard/route.ts`

**Returns:** top 20 creators by lifetime earned USDC: `{ id, slug, displayName, avatarUrl, lifetimeEarnedUsdc, paymentCount, contentCount, viewerCount, onchainSettledCount }`.

**SQL:** groupBy `Payment.toUserId` sum `amountUsdc` count `id` filter `settledOnchain` (for proof badge), join User. Use raw query if Prisma can't express it cleanly.

**Window:** also accept `?window=7d|30d|all` (default `all`).

**Step 1: Implement (start with `all` only, add windows if time allows).**
**Step 2: Smoke.**
**Step 3: Commit.**

---

## Task 5: GET /api/creator/[slug]

**Files:**
- Create: `web/app/api/creator/[slug]/route.ts`

**Returns:** `{ creator: { id, slug, displayName, avatarUrl, bio, walletAddress, ownedEoaAddress }, content: ContentUrl[] with counts, lifetimeEarnedUsdc, lifetimePaymentCount, onchainSettledCount }`. 404 if no creator with slug.

Show only creators with `role=creator` AND have at least 1 ContentUrl, OR allow viewer slugs too? — start with creators only.

**Step 1: Implement.**
**Step 2: Smoke.**
**Step 3: Commit.**

---

## Task 6: shadcn/ui install + base nav header

**Files:**
- Run: `cd web && pnpm dlx shadcn@latest init` (or `npx`). Pick: New York / Slate / CSS variables / `@/components/ui`.
- Run: `pnpm dlx shadcn@latest add button card avatar badge separator skeleton tabs input textarea`
- Create: `web/components/SiteHeader.tsx`
- Modify: `web/app/layout.tsx` to include `<SiteHeader />`

**SiteHeader contents:**
- Logo "mtrly" → `/`
- Center nav: `Explore` `Leaderboard` `How it works` (anchor link to home section)
- Right: when logged in → Avatar dropdown (Balance / Dashboard / Settings / Logout). When logged out → Log in / Sign up.
- Sticky top.

**Step 1: shadcn init.**
**Step 2: Add components.**
**Step 3: Build SiteHeader, mount in layout.**
**Step 4: Visual check on `/`.**
**Step 5: Commit** — `chore(ui): install shadcn/ui + add site header`.

---

## Task 7: /explore page

**Files:**
- Create: `web/app/explore/page.tsx`

**Layout:**
- Header: "Discover creators paid by the second"
- Filter tabs: All · YouTube · Articles · Sort: Recent / Trending / Top earning
- Grid: 2-col mobile / 3-col desktop. Each card:
  - Avatar (Boring Avatars fallback) + display name + slug (linked to `/c/[slug]`)
  - Content title (truncated) + kind badge
  - Stats row: `N viewers · $X.XX earned · {n} onchain`
  - Hover: shows the URL

Use shadcn Card + Avatar + Badge.

**Step 1: Build.**
**Step 2: Visual check.**
**Step 3: Commit.**

---

## Task 8: /leaderboard page

**Files:**
- Create: `web/app/leaderboard/page.tsx`

**Layout:**
- Tabs: All-time / 30 days / 7 days
- Top 3 podium cards (gold/silver/bronze accents, larger)
- Rank 4-20 as compact rows: rank · avatar · name · lifetime $ · onchain settlement count badge · link to /c/[slug]
- Subtitle with onchain-proof claim: "All earnings settle on Arc Testnet via Circle Gateway. Click any creator to verify."

**Step 1: Build.**
**Step 2: Visual check.**
**Step 3: Commit.**

---

## Task 9: /c/[slug] public creator page

**Files:**
- Create: `web/app/c/[slug]/page.tsx`

**Layout:**
- Hero: avatar + display name + bio + "Active on Arc Testnet" badge with arcscan link to `ownedEoaAddress`
- Stats row (cards): Lifetime earned · Onchain settled · Active content
- Content grid: same card style as /explore
- "How to support" callout: "Install the Mtrly extension and watch their content — every second flows through Circle Gateway. No subscription."
- Share row: copy-link, X (twitter), Telegram (basic intent URLs)

**SEO:** `generateMetadata` with title/description.

**Step 1: Build.**
**Step 2: Visual check.**
**Step 3: Commit.**

---

## Task 10: /settings profile page

**Files:**
- Create: `web/app/settings/page.tsx`

**Form:**
- Display name (text input)
- Slug (text input + helper "Your public URL: mtrly.app/c/<slug>", validate live)
- Avatar URL (text input + preview)
- Bio (textarea, 500 char counter)
- Save button → PUT /api/profile

Show wallet addresses (read-only) + arcscan links at bottom.

**Step 1: Build.**
**Step 2: Smoke.**
**Step 3: Commit.**

---

## Task 11: /balance onboarding card

**Files:**
- Modify: `web/app/balance/page.tsx`

**Logic:** if user balance == 0 AND payment count == 0 → show prominent onboarding card at top:

```
Welcome to Mtrly. Three steps to your first tick:
[1] Top up your balance     [+ Deposit USDC button → opens deposit address modal]
[2] Install the extension    [Download .zip button]
[3] Watch any video          [Try the demo article button]
```

Each step has check-mark when complete (deposit done? extension detected via localStorage flag? first session exists?).

**Step 1: Build.**
**Step 2: Visual check (logged-out + fresh-account states).**
**Step 3: Commit.**

---

## Task 12: Polish home page

**Files:**
- Modify: `web/app/page.tsx`

**Changes:**
- Replace "Creator dashboard" CTA with "Explore creators" → `/explore`
- Add a short row "Top creators this week" pulling from `/api/leaderboard?window=7d` (3 cards)
- Keep LiveTicker section.

**Step 1: Build.**
**Step 2: Visual check.**
**Step 3: Commit.**

---

## Task 13: Final commit + changelog + circlefeedback

**Files:**
- Modify: `CHANGELOG.md` (`Added` section with the new pages + endpoints)
- Modify: `circlefeedback.md` (Successes: leveraging onchain settlement counts as a discovery signal; Challenges: Arc testnet RPC mempool full during fund-user-eoa testing)
- Run: `docker compose build web && docker compose up -d web`

**Step 1: Update changelog.**
**Step 2: Update circlefeedback.**
**Step 3: Rebuild + deploy.**
**Step 4: Smoke /explore /leaderboard /c/[slug] /settings.**
**Step 5: Commit + push.**

---

## Decisions log
- **Slug from email** for v1 — no slug-picker on signup, user can change later in /settings.
- **Avatars: URL field only** — no upload pipeline. If URL empty, show Boring Avatars-style hash-based fallback (no extra package — render `<svg>` from initials).
- **Leaderboard ranks by lifetime $** — not view count or onchain count, because $ is the strongest "this is real money" signal for the hackathon judges.
- **No follow/subscribe** — pay-per-second IS the engagement model; adding follows complicates the story.
- **`/dashboard` not redesigned** — only nav-bar + minor shadcn polish. Full Boosty-style creator dash is post-hackathon.
