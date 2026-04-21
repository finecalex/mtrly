# Changelog

All notable changes to Mtrly are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Every commit updates this file. Every push to `main` auto-deploys to prod.

---

## [Unreleased]

### Added
- **Phase 0 — Scaffold.** Next.js 14 (App Router) + TypeScript + Tailwind + Prisma web-app in `web/`.
- Landing page (`/`), auth stubs (`/auth/login`, `/auth/signup`), creator dashboard stub (`/dashboard`), balance stub (`/balance`) — all copy-only placeholders for later phases.
- API routes: `GET /api/health` (liveness), `GET /api/match?url=...` (URL lookup for extension whitelist).
- `lib/url.ts` — URL normalizer (YouTube `v=` extraction, strips UTM/tracking, removes trailing slash).
- `lib/config.ts` — pricing constants hard-coded from PRD (`$0.05/min`, 5-sec tick, `$0.005/paragraph`, 3-sec dwell, 80% unlock, 80/20 split).
- Prisma schema: `User`, `Balance`, `BalanceTransaction`, `ContentUrl`, `ViewSession`, `Consumption`, `Payment` (PRD §5.2).
- Chrome MV3 extension scaffold in `extension/`: manifest, background service worker, content script (calls `/api/match`, injects side panel on match), popup (login/top-up buttons), overlay CSS.
- Docker Compose: `59513674-circlearc-web` (Next.js, VIRTUAL_HOST=circlearc-59513674.slonix.dev) + `59513674-circlearc-postgres` with resource limits; external `proxy` network.
- `.env.example` — `POSTGRES_PASSWORD`, `JWT_SECRET`, `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `PLATFORM_WALLET_PRIVATE_KEY`.

### Docs
- `CLAUDE.md`: add mandatory changelog rule — every commit updates `CHANGELOG.md`.
- `CLAUDE.md`: document auto-deploy-on-push policy for `main` (treat every commit as prod release).
- `CHANGELOG.md`: bootstrap file.

### Fixed
- Dockerfile: install `prisma@5.20.0` globally in runtime stage + switch entrypoint to `prisma db push` (no migrations yet); add `linux-musl-openssl-3.0.x` to Prisma `binaryTargets` for Alpine compatibility.

---

## [0.0.1] — 2026-04-21

### Added
- `PRD.md` — Mtrly project spec: pay-per-second video content, platform balance model, x402 Nanopayments on Arc.
- `HACKATHON_BRIEF.md` — Agentic Economy on Arc hackathon requirements, tracks, judging criteria.
- `TECH_REFERENCE.md` — Arc + Circle Nanopayments + Wallets integration notes.
- `CLAUDE.md` — agent instructions, mandatory pre-push secret scan.
- `.gitignore` — excludes SSH keys, env files, Circle credentials, wallet files.
