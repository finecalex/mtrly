# Changelog

All notable changes to Mtrly are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Every commit updates this file. Every push to `main` auto-deploys to prod.

---

## [Unreleased]

### Added
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
