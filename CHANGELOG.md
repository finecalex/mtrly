# Changelog

All notable changes to Mtrly are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Every commit updates this file. Every push to `main` auto-deploys to prod.

---

## [Unreleased]

### Added
- **Native articles — creators can write content directly on Mtrly.** Until now creators had to host content elsewhere (YouTube, their own blog) and register the URL. Now they can publish article-style text directly inside Mtrly, metered by the same per-paragraph extension flow.
  - `ContentKind.mtrly` enum + `ContentUrl.bodyMarkdown` (Postgres `Text`) — native articles are first-class ContentUrl rows. After insert, `rawUrl` and `normalizedUrl` are set to the canonical `https://<host>/a/<id>` so the extension's `/api/match` keeps working uniformly across kinds.
  - `lib/articleBody.ts` — `splitParagraphs()` (split on blank lines), `renderInline()` (XSS-safe escape + lightweight markdown: `**bold**`, `*italic*`, `[text](https://url)` external-only links), `firstParagraphPreview()`, `paragraphCount()`.
  - `POST /api/creator/content` — schema is now a Zod discriminated union `mode: "url" | "article"`. Article-mode validates body 20-50000 chars + creates the row + assigns canonical URL in a 2-step transaction. Returns `{articleUrl: "/a/<id>"}` for the dashboard's success card. Existing url-mode behavior unchanged for backward compat.
  - `PATCH /api/creator/content` — accepts `body` updates (only persisted if `kind == "mtrly"`).
  - `web/app/a/[id]/page.tsx` — public reader page (server component). Hero with hash-gradient + sparkle + title + description, creator strip with avatar + slug link, paragraph count + lifetime cost (`N paragraphs · ~$0.025 to fully read`), onchain-settlements badge. The body renders inside `<article>` with `<p data-mtrly-paragraph={i}>` so the existing extension's `<article> <p>` paywall logic kicks in unchanged. Auth gate: paragraph 0 is always visible; for non-authed visitors paragraphs 1+ get `blur-sm saturate-50 select-none` plus a green "First paragraph is on the house · Sign up to read" CTA card above the article and "{N-1} more paragraphs locked" CTA below; signup CTAs include `?next=/a/<id>` redirect. Owner-preview yellow card if you read your own article. Footer arcscan link to creator's settlement EOA.
  - `lib/gradients.ts` — 10-palette deterministic 3-stop hash-gradient. Used for: article hero, ContentCard fallback when no thumbnail (every article gets a stable, distinct color), with `hashGradient(seed, angle)` and `hashGradientPair(seed)`.
  - `<ContentCard>` updates: Mtrly cards get hash-gradient preview with title overlay (instead of generic muted box + kind icon); non-mtrly cards without thumbnails also get hash-gradient instead of grey. CTA reads "Read" with `BookOpen` icon for mtrly (vs "Tune in" with `Play` for video/external article); "Read" links internally to `/a/<id>` (no `target=_blank`). For mtrly content `canTuneIn=true` regardless of auth, since the article page paywalls itself paragraph-by-paragraph — non-authed visitors should be able to land on the page and see the free first paragraph as a teaser.
  - Dashboard: "Publish new content" section now has tabs "Register external URL" / "Write article on Mtrly". Article writer = title + description (280-char counter) + body textarea (12 rows, 50000 char limit, live paragraph count). On publish, success card shows the `/a/<id>` link. Dashboard content table links mtrly rows to `/a/<id>` internally instead of opening externally.
  - Verified end-to-end on prod: creator-id 10 published `/a/5` ("Why nanopayments matter", 5 paragraphs). Logged-out reader sees paragraph 0 clear + paragraphs 1-4 with blur classes. Authed creator (owner) sees all 5 clear + owner-preview banner.

- **Content previews + auth-gated URLs (paywall integrity).** Logged-out visitors of `/explore` and `/c/[slug]` could previously click straight through to the YouTube/article URL — bypassing the meter. Fixed by:
  - `ContentUrl.description` (varchar 280) + `ContentUrl.previewImageUrl` columns; creators add a teaser description on registration; thumbnails auto-derived from YouTube URLs (`i.ytimg.com/vi/<id>/hqdefault.jpg`).
  - `lib/youtube.ts`: `extractYouTubeVideoId()` + `youtubeThumbnail()` + `previewImageForUrl()`.
  - `/api/explore` and `/api/creator/[slug]` now return `rawUrl: null` + `normalizedUrl: null` when the caller is not authenticated. Description + preview image are always returned (so cards stay informative). When authed, full `rawUrl` is returned and the "Tune in →" CTA opens directly.
  - `<ContentCard>` (new shared component, `web/components/ContentCard.tsx`) — used by `/explore` and `/c/[slug]`. Renders 16:9 thumbnail with a center overlay: locked padlock + "Sign up to watch" for non-authed (thumbnail blurred + saturate-50), or hover-reveal play button + "Tune in" for authed. Title + 3-line description + earned/onchain stats below. Footer CTA "Sign up to watch" → `/auth/signup`, or "Tune in →" external link with `target=_blank`. Trending 7d badge.
  - Dashboard "Register new content" form gains a description textarea (280-char counter) + helper note "URL stays hidden from logged-out visitors so they can't skip the meter."
  - `PATCH /api/creator/content` for editing existing title/description/preview without re-registering.
  - `POST /api/admin/backfill-thumbnails` — one-shot backfill for legacy YouTube content (already run on prod, 2/4 ContentUrls updated — the other 2 are web URLs, no thumbnail).
  - Banner on `/explore` for non-authed users explaining: "Previews are blurred until you sign up. Watching always pays the creator — the URL stays hidden so the meter can't be skipped."

- **Consumer surface — Patreon/Boosty-style discovery, leaderboard, public creator pages.** New top-level routes turn Mtrly from a developer demo into something a non-technical viewer can navigate in under 30 seconds, while keeping the Circle/Arc onchain-proof story front and center.
  - `GET /api/explore` — paginated catalog of all registered ContentUrls joined with creator metadata + per-content aggregates (lifetime earnings, payment count, onchain-settled count, 7-day trending USDC, viewer count, session count). Filters: `?kind=youtube|web|all`, `?sort=recent|trending|earnings`. ISR `revalidate = 30s`.
  - `GET /api/leaderboard?window=7d|30d|all` — top creators by lifetime USDC earned via `payment.groupBy({by:["toUserId"]})`. Returns rank, slug, displayName, avatarUrl, ownedEoaAddress (for arcscan link), payment count, onchain-settled count, content count.
  - `GET /api/creator/[slug]` — public creator profile: hero (avatar/bio/wallets/joined date), all their content with per-item aggregates, lifetime stats. 404 on unknown slug. ISR `revalidate = 30s`.
  - `GET /api/profile` + `PUT /api/profile` — authed user reads/edits own `displayName`, `slug`, `avatarUrl`, `bio`, `role`. Slug validated server-side (lowercase alphanumeric + hyphen, 3–32 chars, reserved-list blocked, uniqueness enforced).
  - `User.slug @unique`, `User.avatarUrl`, `User.bio` (varchar 500) added to Prisma schema; `lib/profile.ts` derives slug from email at signup with collision handling. Backfill helper `backfillSlugForAllUsers()` for legacy users.
  - `/explore` — discovery grid (creator card + content thumbnail + viewers/earned/onchain stat row + 7d trending badge), filter tabs (All/YouTube/Articles), sort tabs (Recent/Trending/Top earning).
  - `/leaderboard` — top-3 podium (gold/silver/bronze accent borders + glow + arcscan-verify link) + ranked table for #4–20, window switcher (All / 30d / 7d).
  - `/c/[slug]` — public creator page: hero with avatar/bio/joined-date + green "Active on Arc Testnet" badge linking to `ownedEoaAddress` on arcscan; 4-stat grid (Lifetime earned / Payments / Onchain settled / Active content); content grid; "How to support" call-to-action; copy-link / X / Telegram share row. Has `generateMetadata` for OG/SEO. ISR.
  - `/settings` — profile editor (display name / slug live-preview / avatar URL with preview / bio with 500-char counter / role toggle viewer↔creator) + read-only wallet addresses with arcscan links.
  - `/balance` — onboarding card for new users (balance==0 AND no payment_out tx): 3-step "Top up · Install ext · Try demo" with live progress check-marks (deposit detected, first tick detected) and CTAs to `/explore` and `/leaderboard`. Tries to make first-time users self-serve.
  - `/` (home) — replaced "Creator dashboard" CTA with "Explore creators" + "Leaderboard"; new `<TopCreatorsStrip>` shows 6 top creators inline (server fetched from `/api/leaderboard?limit=6`); LiveTicker section retained.
  - **Site-wide nav header** (`<SiteHeader>` mounted in `app/layout.tsx`): sticky, blur, brand dot, Explore/Leaderboard nav links, right-side avatar dropdown when signed in (Balance / Creator dashboard / My public page / Settings / Log out) or Log in / Sign up CTAs when signed out. Pulls `slug` + `avatarUrl` from `/api/auth/me` (which now includes both fields).
  - **Lightweight UI primitives** under `web/components/ui/`: `Card`, `Button` (cva variants: primary/secondary/outline/ghost/link/destructive · sizes sm/md/lg/icon), `Badge` (default/accent/onchain/muted/warn/kind), `Avatar` (gradient + initials fallback, hash-based palette of 8 colors), `Input/Textarea/Label`. No external dep on shadcn CLI — primitives match shadcn API surface but stay self-contained for offline-friendly Docker builds. Tailwind theme extended with `surface-2`, `border-strong`, `accent-warm`, `accent-pink`, and `bg-creator-card` / `bg-hero-glow` gradients.

- **Per-user tick-signing wallets (Phase 1 of the "real" flow).** Each Mtrly user now gets their own viem EOA at signup — private key generated with `viem/accounts.generatePrivateKey`, encrypted via AES-256-GCM (`MTRLY_USER_KEY_ENC`, 32-byte hex), stored in `User.ownedEoaPrivateKeyEncrypted`; address persisted in `User.ownedEoaAddress`. `lib/userWallet.ts` owns encrypt/decrypt + `provisionLocalEoa()` + `ensureLocalEoa()` (lazy provision for legacy users) + `getUserGatewayClient()` (per-userId cached `GatewayClient`). `web/lib/billing.ts` `applyTick` now prefers the viewer's own `GatewayClient` when settling each nanopayment via x402; falls back to the platform demo-buyer if the user has no local EOA. `web/lib/gateway.ts` `settleTickViaGateway` accepts an optional `buyerClient` for this. New `POST /api/admin/fund-user-eoa` (admin-key gated) calls `platformClient.depositFor(amount, user.ownedEoaAddress)` so the platform can seed any user's Gateway pool from its own pool without the user needing gas. New `GET /api/wallet/mine` returns the signed-in user's EOA + live Gateway pool balance. `/balance` gains a green accent-card "Your tick-signing wallet · Arc Testnet" with pool + EOA USDC + arcscan link. `Payment.onchainFromAddress` records the actual signer for each settled tick — transparency proof that reviewers can verify on arcscan.

### Docs
- **CLAUDE.md: formalize the "commit-then-rebuild" deploy pattern** under the AUTO-DEPLOY section. We don't have CI wired up yet — the agent runs in the same shell as the Docker daemon that hosts prod, so the deploy mechanism is explicitly `docker compose build web && docker compose up -d web` after every `git push` to `main`, plus a `curl` verification. Alternative (webhook puller / GH Actions runner) was considered and rejected for the hackathon finale: zero new infra beats marginal convenience. Rule: agents MUST NOT skip the rebuild step — `git push` alone does not change prod.

### Added
- **Onchain settlement proof surfaced across the product** — the whole point of the Arc/Gateway integration is transparency, so we now show it everywhere a reviewer will look. (1) `/balance` — new green "Onchain settlement proof" card under the Gateway status grid, shows completed-transfer count + lifetime USDC settled + link to the platform demo-buyer EOA on arcscan. (2) `/dashboard` (creator) — new "Settlement proof" section linking the creator's own Circle wallet to arcscan, plus "N payments · M onchain" split on the Lifetime-earned card. (3) Browser extension — video panel gains a footer row showing "Arc Testnet" chain badge + "settlement proof ↗" link to `/balance`, so viewers see the chain their nanopayments settle on without leaving the page. Implementation: `/api/gateway/status` now returns `completedStats {count, totalUsdc, latestAt, platformAddress, platformExplorerUrl}`; `/api/creator/earnings` returns `onchainSettledCount` (Prisma `payment.count({settledOnchain:true})`).
- **`circlefeedback.md` — dedicated Circle-stack feedback log.** New root-level file seeded with the 5 canonical hackathon-feedback sections (Products Used, Use Case, Successes, Challenges, Recommendations) + change-log footer. Seeded entries include the Apr 20–23 Arc Gateway batcher 70h outage (§4.1), the v3 SDK regression where `getTransferById`/`searchTransfers` responses no longer contain `transactionHash` (§4.2), Next.js App Router caching traps (§4.3), mainnet-default-URL silent footgun in v3 `BatchFacilitatorClient` (§4.5), and the status-page split proposal to separately track "Arc CCTP" / "Arc Gateway batch publisher" / "Arc x402 facilitator" (§5.1). The final hackathon submission will copy the best items from here into the Circle Feedback form.
- **`CLAUDE.md` rule: Circle-stack commits must update `circlefeedback.md`.** New mandatory section "🔁 CIRCLE FEEDBACK — MANDATORY WITH EVERY COMMIT THAT TOUCHES CIRCLE STACK" formalizes the workflow: every commit that touches Circle SDK / x402 / Gateway / Arc / CCTP / faucet integration MUST append a numbered entry to the relevant §3–§5 of `circlefeedback.md` in the same commit, with concrete dates/UUIDs/hashes. Rules: never invent new top-level sections; prefer concrete over abstract; stage the feedback update in the same commit as the code change.

### Fixed
- **Creator dashboard was reading a non-existent field `me.circleWalletAddr`** from `/api/auth/me`. The API actually returns `walletAddress`. Fixed via rename in `web/app/dashboard/page.tsx` (Me type + all references) — wallet-address-dependent UI (Circle wallet card, new settlement-proof section) now actually renders for users who have a wallet linked.

### Fixed
- **`/balance` Gateway panel no longer hides `batched`/`failed` history under a fresh `received` flood.** The old `/api/gateway/status` fetched 25 most-recent transfers in a single call sorted by `createdAt` desc — so as soon as >25 new ticks fired after the most recent Circle batcher run (runs roughly every 2h at the top of the hour on testnet), ALL older `batched`/`confirmed`/`failed` rows got pushed off the list and the UI appeared "stuck on received". Now the endpoint fetches per-status (`received`, `batched`, `confirmed`, `completed`, `failed`) via `searchTransfers({status})`, returns aggregate `counts`, and merges them into a 25-row mixed list. UI adds a 5-cell status-count row + footnote explaining Circle's ~2h batcher cadence, so users can see at a glance that e.g. 25 transfers HAVE been batched even when the recent list is all `received`.

### Changed
- **Upgrade `@circle-fin/x402-batching` 2.1.0 → 3.0.1.** v3 is a breaking release: the default URL for `BatchFacilitatorClient` is now **mainnet** (`https://gateway-api.circle.com`) whereas v2.1 defaulted to testnet. `web/lib/x402.ts` now passes `{url: CIRCLE_GATEWAY_URL ?? "https://gateway-api-testnet.circle.com"}` explicitly so testnet stays the default and can be overridden via env. `GatewayClient` (buyer-side) is unaffected — it still derives the endpoint from `chain: "arcTestnet"`. Verified on testnet: `/api/gateway/status` returns `ok:true`, `/api/admin/trigger-tick` returns a fresh Circle transfer UUID. `TECH_REFERENCE.md` updated with v3 breaking-change note and the testnet URL override pattern.

### Fixed
- **Gateway transfer amount was rendered as raw USDC base-units** ("$5000" instead of "$0.005") on `/balance`. `/api/gateway/status` now returns `amount` as a dollar-string ("0.005000") and keeps base-units under `amountBaseUnits`. UI re-labeled to make it explicit that this section shows the **platform demo-buyer's** outbound batching transfers, not the logged-in user's wallet. Failed transfers hidden behind a toggle + explanatory note that failed = Circle testnet bundler error and funds are returned to Gateway balance (no USDC lost).

### Added
- **Phase 2 (belated) — Onchain → ledger sync.** `POST /api/balance/sync` reads the authenticated user's `circleWalletAddr` USDC balance on Arc Testnet (viem `balanceOf` on `0x3600…0000`) and credits the positive delta to their internal `Balance`. Tracked via `BalanceTransaction(type="deposit", referenceId="onchain-sync:<ts>")`, so re-running is idempotent — we only credit amounts beyond what's already been synced. `/balance` page has a new "Sync from wallet" button that calls it. Fixes the long-standing gap where `/balance` told users "Balance refreshes after on-chain settlement" but nothing actually reconciled onchain deposits.
- **`/api/admin/grant-balance` now accepts `walletAddress`** in addition to `email`, for demo top-ups when only the Circle wallet address is known.

### Security
- **Extension permission hardening.** Dropped `storage`, `scripting`, and `cookies` from `manifest.json` — all three were declared but unused (auth rides session cookies via `credentials: "include"`, which needs no permission). Removed dead `getToken`/`setToken` handlers from `background.js`. Kept only `tabs` (for `tabs.onRemoved` session cleanup) and `activeTab` (so the popup can open `/balance` / `/auth/login`). Host permissions (`<all_urls>`) unchanged — required for content-script URL matching. Rebuilt `web/public/mtrly-extension.zip`.

### Added
- **Phase 7.2 — Live activity ticker on landing page.** New `GET /api/activity` public endpoint aggregates `Payment` rows with `nanopaymentTxId != null` (total count, confirmed count, USDC volume + 25 most recent). New `web/components/LiveTicker.tsx` client component polls every 5s and renders 3 stat cards + 10 most-recent list with "onchain ↗" links to arcscan (or "batching…" while Circle confirms). Injected into `/` above the footer as a "Live onchain activity" section — lets hackathon reviewers watch real Arc-testnet txs land in realtime without signing in.
- **Phase 7.2 — Creator withdraw flow.** New `POST /api/creator/withdraw` — authenticated, validates amount (max 100 USDC) + optional `0x…` destination, defaults to the creator's `circleWalletAddr`. Calls `GatewayClient.withdraw()` → produces 1 real mint tx on Arc, decrements `Balance.amountUsdc`, logs `BalanceTransaction(type="withdraw", referenceId="onchain:<hash>")`. Returns `mintTxHash + arcscan url`. Dashboard now has a "Withdraw to wallet" form above "Register new content" showing amount/destination inputs + success card with arcscan link.
- **Phase 6b.1 — x402 settlement resolver.** `settle()` returns a Circle transfer UUID (not the final tx hash) — so `Payment.nanopaymentTxId` holds the UUID and new `Payment.onchainTxHash` holds the real hash once Arc confirms. `POST /api/gateway/resolve` polls `getTransferById()` for pending transfers and writes back the hash + flips `settledOnchain`. Dashboard calls it alongside the 5s refresh. Recent-payments list now shows 3 states: "onchain ↗" (hash populated), "batching…" (UUID only, Circle batching), or "offchain".
- Admin endpoints to work around `docker exec` stdout being silent in this sandbox: `POST /api/admin/trigger-tick` (direct settle), `POST /api/admin/e2e-tick` (creates demo viewer+session, runs `applyTick`, returns Payment row), `GET /api/admin/debug/payments` (dumps last 20), `GET /api/gateway/transfer?id=<uuid>` (inspect transfer lifecycle).

- **Phase 6b — Per-tick x402 onchain settlement.** Each successful offchain tick now fires a real Circle Gateway batched payment from `MTRLY_DEMO_BUYER_KEY` → `PLATFORM_WALLET_ADDRESS` on Arc Testnet. Once Circle confirms, `Payment.nanopaymentTxId` + `settledOnchain=true` get stamped.
- `web/lib/x402.ts` — Circle `BatchFacilitatorClient` singleton + `buildPaymentRequirements({priceDollars, payTo})` (caches Arc `verifyingContract` + USDC address via `/v1/x402/supported`). Handles the `PAYMENT-REQUIRED` / `Payment-Signature` / `PAYMENT-RESPONSE` base64 header dance.
- `GET|POST /api/x402/tick?price=$0.00416` — Next.js App Router port of Circle's `createGatewayMiddleware`: returns 402 with batching-scheme requirements when no `payment-signature` header, else verifies + settles via Circle Gateway and returns the Arc tx hash.
- `web/lib/gateway.ts` → `settleTickViaGateway({amountUsdc})` — server-side buyer calls `GatewayClient.pay(self/api/x402/tick)` so every tick produces a batched onchain transfer without blocking the extension's response.
- `billing.applyTick`: after Prisma commit, fire-and-forget `settleTickViaGateway` → on Circle success, updates `Payment.nanopaymentTxId` + flips `settledOnchain`. Failures logged but don't affect offchain billing.
- Dashboard → Recent payments list now shows per-row "onchain ↗" link (to `testnet.arcscan.app/tx/<hash>`) or "offchain" fallback; `GET /api/creator/earnings` emits `nanopaymentTxId`, `settledOnchain`, `explorerUrl` per row.
- `web/package.json`: pin `@x402/core@^2.3.0` and `@x402/evm@^2.3.0` (required peers of `@circle-fin/x402-batching/server`).

- **Phase 6a — Circle Gateway wiring.** `web/lib/gateway.ts` initializes `@circle-fin/x402-batching` `GatewayClient` on Arc Testnet using demo-buyer EOA `MTRLY_DEMO_BUYER_KEY`. Exposes `gatewayStatus()`, `gatewayDeposit(amt)`, `gatewayWithdraw(amt)`, and an `arcExplorerTx(hash)` helper.
- `GET /api/gateway/status` — public: returns buyer EOA address, wallet + Gateway balances, and 10 most recent Gateway transfers filtered by our address (each with arcscan URL).
- `POST /api/gateway/deposit` and `POST /api/gateway/withdraw` — admin-gated (`x-admin-setup-key`): each call produces 1 real onchain tx on Arc testnet (approval + deposit, or withdraw-mint). Returns tx hashes + explorer links.
- `/balance` page now has a "Circle Nanopayments · Gateway" section showing live Gateway balance, EOA balance, and recent batched transfers with arcscan links.
- `PLATFORM_WALLET_ADDRESS` — public seller address for upcoming x402 per-tick settlement (Phase 6b).

### Fixed
- `web/Dockerfile`: add `RUN chmod -R a+rX /app` after COPY-from-build so files with restrictive host perms (umask 077 → 0600 on `package.json`) become readable by the `nextjs` runtime user. Container was crash-looping with `EACCES: permission denied, open '/app/package.json'` after rebuild.

### Added
- **Phase 7.1 — Downloadable extension.** `web/public/mtrly-extension.zip` is now served as a static asset on the prod domain (`https://circlearc-59513674.slonix.dev/mtrly-extension.zip`). Landing page step 2 now has a direct download link so reviewers don't have to `git clone`.
- `scripts/build-extension-zip.js` — Node+archiver script to regenerate the zip from `extension/` (run whenever extension source changes).
- `extension/README.md` + `DEMO.md`: document both install paths — download-zip and git-clone.

- **Phase 7 — Demo polish.** Landing page now has a "Try it in two minutes" walk-through linking to signup, demo article, and a pre-registered YouTube video, plus a Creator dashboard button.
- `DEMO.md` — single-page hackathon demo guide: install → signup → top-up → YouTube tick → article blur/reveal → creator dashboard; includes the money-flow diagram and what-comes-next list.
- `extension/README.md` — fleshed out: load-unpacked steps, video vs text UX, permissions rationale ("we only contact circlearc-59513674.slonix.dev — no browsing-history exfil"), package command for store submission.

- **Phase 5 — Creator dashboard.** `/dashboard` now shows live balance, lifetime earnings (creator&apos;s 80% share), registered URL count, content table with per-URL sessions/viewers/earnings, and the 20 most recent payments. Polls `/api/creator/earnings` every 5s.
- `GET /api/creator/earnings` — aggregates `Payment` records via `$sum`/`$count` and scales amounts by `PRICING.split.creator` so the UI shows the creator&apos;s net take (not gross viewer spend).
- Inline "register new content" form on the dashboard — POSTs to `/api/creator/content`.
- Verified end-to-end on prod with Playwright: Creator One dashboard correctly renders $0.017333 balance, 5 payments across 2 URLs (YouTube + demo article).

### Changed
- `prisma/schema.prisma`: add `Payment.content` back-relation to `ContentUrl` (fields `contentId`, `onDelete: SetNull`) so earnings queries can `include: { content: {...} }`.

- **Phase 4 — Text paragraph paywall.** For `kind = web` content, the extension blurs every paragraph past the first (first is free per PRD), watches scroll position via `IntersectionObserver`, and when a paragraph is ≥50% in viewport for 3 consecutive seconds it calls `/api/billing/tick` — unblurring the paragraph on 200, showing the insufficient-balance overlay on 402.
- `GET /api/consumption?url=...` — returns the viewer&apos;s `unitsConsumed` for a given URL so the extension can mark already-paid paragraphs as free on refresh (no re-billing).
- Extension background: generic `fetch` message handler forwards arbitrary GET calls with credentials, used by the text flow.
- `/demo/article` — reproducible long-form demo page (7 paragraphs) for end-to-end text-paywall demos without depending on third-party sites.

### Changed
- Extension panel now shows a `Paragraphs paid / total` row when viewing text content.
- Extension CSS: `.mtrly-blurred` class with 5px blur + badge overlay in top-right of each locked paragraph.

- **Phase 3 — Video extension flow.** Chrome extension now detects YouTube `<video>` elements, drives the billing loop, and paywalls playback per-second.
- Extension: listens to `play`/`pause`/`ended` on the video element; starts a session on first play, ticks every 5s via `chrome.runtime.sendMessage` → background → `/api/billing/tick`; on HTTP 402 pauses the video and shows a blocking overlay linking to `/balance`; on 401 shows a "Sign in" overlay linking to `/auth/login?ext=1`.
- Extension background: added `sessionStart`, `tick`, `sessionEnd`, `me` message handlers; tracks `sessionId` per tab; cleans up on `tabs.onRemoved`; all API calls use `credentials: "include"`.
- Extension panel now shows live balance, cumulative spend for this view, rate, and creator name; status dot reflects playing/paused/blocked.
- SPA URL-change detection via `MutationObserver` so YouTube client-side navigation tears down the old session and re-bootstraps for the new video.
- Popup reads `/api/auth/me` for display name + balance.
- `web/middleware.ts` — CORS handler for `/api/*`: echoes back `chrome-extension://*` and `moz-extension://*` origins with `Access-Control-Allow-Credentials: true` and responds to preflights.

### Changed
- `lib/auth.ts`: session cookie `SameSite=none` (with `Secure`) so the extension's cross-origin fetch can include it.
- Extension manifest: bump to 0.1.0; add `scripting` + `cookies` permissions; pin `https://circlearc-59513674.slonix.dev/*` in host_permissions.

- **Phase 2 — Nanopayments Engine (offchain ledger).** Atomic Prisma-transaction billing with 80/20 creator/platform split, insufficient-balance rejection (HTTP 402), and cumulative consumption + unlock-threshold tracking per (viewer, content) pair.
- `lib/billing.ts` — `applyTick({viewerId, sessionId})` runs debit + 80/20 split + payment log + consumption update + session tick advance inside a single `$transaction`; computes tick amount from `PRICING` based on content kind.
- `lib/platform.ts` — `getPlatformUserId()` auto-seeds a singleton `platform@mtrly.local` account on first tick to receive the 20% platform fee.
- API routes: `POST /api/session/start`, `POST /api/session/end`, `POST /api/billing/tick`, `POST /api/admin/grant-balance` (admin-gated testnet top-up), `GET/POST /api/creator/content` (register URLs + list own content).
- **Phase 1 — Auth + Circle dev-controlled wallets.** Email/password signup auto-provisions an Arc-testnet EOA via `@circle-fin/developer-controlled-wallets` and binds it to the user.
- `lib/circle.ts` — Circle SDK client singleton (reads `CIRCLE_API_KEY` + `CIRCLE_ENTITY_SECRET`); `ARC_BLOCKCHAIN = "ARC-TESTNET"` constant (cast via `any` — SDK v8 types lag behind API).
- `lib/wallet.ts` — `provisionUserWallet(userId)`; creates wallet set on first run (or reuses `CIRCLE_WALLET_SET_ID`), creates 1 EOA wallet on Arc testnet, persists `circleWalletId` + `circleWalletAddr` on the user.
- `lib/auth.ts` — bcrypt password hashing + jose HS256 JWT sessions (30-day cookie `mtrly_session`, httpOnly, secure, sameSite=lax).
- API routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/extension-token`, `GET /api/balance/status`.
- `POST /api/admin/register-entity-secret` — one-shot admin endpoint guarded by `x-admin-setup-key` header that registers the Circle entity secret ciphertext.
- `/auth/extension/bridge` page — post-login deep-link that hands the session back to the Chrome extension.
- Signup/login forms wired to real API; balance page reads `/api/auth/me` for wallet address + balance display; forms wrapped in `<Suspense>` to satisfy Next 14 static-prerender requirement for `useSearchParams()`.
- **Phase 0 — Scaffold.** Next.js 14 (App Router) + TypeScript + Tailwind + Prisma web-app in `web/`.
- Landing page (`/`), auth stubs (`/auth/login`, `/auth/signup`), creator dashboard stub (`/dashboard`), balance stub (`/balance`).
- API routes: `GET /api/health` (liveness), `GET /api/match?url=...` (URL lookup for extension whitelist).
- `lib/url.ts` — URL normalizer (YouTube `v=` extraction, strips UTM/tracking, removes trailing slash).
- `lib/config.ts` — pricing constants hard-coded from PRD (`$0.05/min`, 5-sec tick, `$0.005/paragraph`, 3-sec dwell, 80% unlock, 80/20 split).
- Prisma schema: `User`, `Balance`, `BalanceTransaction`, `ContentUrl`, `ViewSession`, `Consumption`, `Payment` (PRD §5.2).
- Chrome MV3 extension scaffold in `extension/`: manifest, background service worker, content script (calls `/api/match`, injects side panel on match), popup (login/top-up buttons), overlay CSS.
- Docker Compose: `59513674-circlearc-web` (Next.js, VIRTUAL_HOST=circlearc-59513674.slonix.dev) + `59513674-circlearc-postgres` with resource limits; external `proxy` network.

### Changed
- `web/package.json`: add `@circle-fin/developer-controlled-wallets@^8.0.0`, `bcryptjs`, `jose`, `uuid` (+ types).
- docker-compose: pass `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `CIRCLE_WALLET_SET_ID`, `ADMIN_SETUP_KEY`, `JWT_SECRET` env to `web` service.
- `.env.example`: add `CIRCLE_WALLET_SET_ID`, `ADMIN_SETUP_KEY`.
- `.gitignore`: add `recovery*.dat`, `*private-key*`, `entity-secret*`.

### Fixed
- Dockerfile: install `prisma@5.20.0` globally in runtime stage + switch entrypoint to `prisma db push` (no migrations yet); add `linux-musl-openssl-3.0.x` to Prisma `binaryTargets` for Alpine compatibility.

### Docs
- `CLAUDE.md`: add mandatory changelog rule — every commit updates `CHANGELOG.md`.
- `CLAUDE.md`: document auto-deploy-on-push policy for `main` (treat every commit as prod release).
- `CHANGELOG.md`: bootstrap file.

---

## [0.0.1] — 2026-04-21

### Added
- `PRD.md` — Mtrly project spec: pay-per-second video content, platform balance model, x402 Nanopayments on Arc.
- `HACKATHON_BRIEF.md` — Agentic Economy on Arc hackathon requirements, tracks, judging criteria.
- `TECH_REFERENCE.md` — Arc + Circle Nanopayments + Wallets integration notes.
- `CLAUDE.md` — agent instructions, mandatory pre-push secret scan.
- `.gitignore` — excludes SSH keys, env files, Circle credentials, wallet files.
