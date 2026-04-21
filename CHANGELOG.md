# Changelog

All notable changes to Mtrly are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Every commit updates this file. Every push to `main` auto-deploys to prod.

---

## [Unreleased]

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
