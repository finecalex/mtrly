# Mtrly — pay-per-action content on Arc

> Submission for **Agentic Economy on Arc** (Circle + lablab.ai · Apr 20–26, 2026).

**Live demo:** https://mtrly.xyz
**Onchain proof (live settlement pool):** https://testnet.arcscan.app/address/0x518dBC8D650666889575178E8f0bDDcDd68063B1
**Source:** https://github.com/finecalex/mtrly · MIT-licensed

---

## What it is

Mtrly is a meter for online content. As a viewer reads or watches, USDC streams from their wallet to the creator in real time — **$0.005 per paragraph**, **$0.05 per minute** of video. The first paragraph is free, the rest cost only what you actually consume. Every payment is a real Arc Testnet USDC nanopayment, batched through Circle Gateway for sub-cent effective gas.

> Today the creator economy mostly runs on monthly subscriptions — fans pay full price even when they barely watched, and creators see no signal about what their audience actually values. A live meter fixes both sides. It was economically impossible until Arc landed: USDC is the native gas token and Circle's nanopayment standard batches many tiny payments into one onchain transaction, so per-action pricing finally makes money.

## Demo this in 90 seconds

1. **Open** https://mtrly.xyz
2. **Try demo** — one click provisions a fresh viewer + Circle Wallet + Arc EOA + $1 of real testnet USDC seeded onchain (2 fresh arcscan transactions visible in the toast).
3. **Read** an article: https://mtrly.xyz/a/5 ("Why nanopayments matter"). First paragraph is free. Each blurred paragraph shows a "tap to reveal · $0.005" pill — tap and a real `/api/billing/tick` fires, balance drops half a cent, paragraph reveals with a sparkle animation.
4. **Open the creator dashboard** (sign in as a creator) — engagement chart per article, income chart, and an **auto-cashout** toggle that flushes accumulated earnings to the creator's Arc wallet automatically when balance crosses a threshold (each cashout is a real Gateway mint visible on arcscan).
5. **Public stats:** https://mtrly.xyz/stats — live network metrics, pulls completed Circle Gateway transfers in real time.
6. **Verify onchain:** every payment chip on `/dashboard`, every "view onchain" link on the live ticker, the platform Gateway address on arcscan — all serve as audit anchors.

## Architecture

```
┌───────────┐    tap (HTTP)      ┌──────────────┐   settle (HTTP 402)    ┌────────────────┐
│  Viewer   │ ─────────────────► │  Mtrly API   │ ────────────────────► │ Circle Gateway │
│ (browser) │                    │  (Next.js)   │                       │ (x402 facil.)  │
└───────────┘                    └──────────────┘                       └────────────────┘
     │                                  │                                         │
     │   Signed EIP-3009                │   Postgres ledger                       │  Batched
     │   (per-user EOA)                 ▼   (offchain mirror)                     ▼  transfer
     │                          Balance / Payment / Consumption           Arc Testnet (USDC)
     │                                  │                                         │
     │                                  │   creator threshold hit ─►  Gateway.withdraw ─► creator EOA
     │                                  │                                         │
     └────────── arcscan.app/tx/<hash> ◄┴─────────────────────────────────────────┘
                  (verifiable on chain)
```

- **Per-user tick-signing wallets.** Every viewer gets their own `viem` EOA, encrypted server-side with AES-256-GCM. Each onchain settlement names the actual viewer's address as `from` — no platform-pays-for-everyone demo cheat.
- **Offchain ledger.** A single Prisma transaction debits the viewer / credits the creator (80%) / takes platform cut (20%) atomically per tick.
- **Async onchain settlement.** After the Postgres commit, a fire-and-forget call to Circle Gateway (`@circle-fin/x402-batching`) pushes the tick into the batched settlement pipeline. User response isn't blocked.
- **Self-healing settlement poller.** A background loop (`web/lib/onchainPoller.ts` + `instrumentation.ts`) every 5s walks pending Payments and tries to populate `onchainTxHash` from `searchTransfers({status:"completed"})`. Falls back to flipping `settledOnchain=true` so the UI never stalls on the SDK's missing-hash regression.
- **Auto-cashout to creator EOA.** Threshold-based per-creator batched mint: when a creator's balance crosses `$0.05 / $0.10 / $0.50 / $1.00` (configurable per creator), a single Gateway mint flushes the full balance to their Arc wallet. One onchain tx per "fill" — gas-efficient, fully visible on arcscan.

## Highlights

- **Tap-to-reveal article reader.** `/a/[id]` blurs each paragraph until the user taps it; sparkle-sweep animation + "+ $0.005" coin-pop chip. Refresh-safe via per-viewer localStorage so re-opening doesn't re-charge.
- **Per-article engagement analytics.** Creator dashboard shows engagement % per paragraph, dropoff point, total views — built from `Consumption.unitsConsumed` directly, no extra tracking pixel needed.
- **Browser extension** (`extension/`) — Chrome MV3 manifest, meters reading on any web article and watching on YouTube. Detects YouTube ads and skips ticks during them. Popup shows recent ticks with arcscan-linked tx hashes.
- **One-click demo signup** — `POST /api/auth/demo` creates a fresh user, provisions Circle Wallet + EOA, seeds $1 onchain via `Gateway.depositFor`, returns the explorer URLs. No email / password flow.
- **Live ticker** (`/`) and public stats page (`/stats`) — hits `searchTransfers` every 5–10s, surfaces real Gateway throughput.

## Repo layout

| Path | Purpose |
| --- | --- |
| `web/` | Next.js 14 app (App Router, Prisma, Tailwind, shadcn-style primitives) |
| `web/app/api/x402/tick/route.ts` | The 402 endpoint that accepts batched payments |
| `web/lib/{billing,gateway,userWallet,autoWithdraw,onchainPoller}.ts` | Tick engine, Gateway client, EOA store, auto-cashout, settlement poller |
| `web/components/{MeteredArticle,EngagementOverview,LiveTicker}.tsx` | Tap-to-reveal reader, per-article engagement chart, live activity panel |
| `web/app/{explore,leaderboard,c,a,settings,balance,dashboard,how-it-works,stats}` | Consumer + creator UI |
| `extension/` | Chrome MV3 extension that watches video/text and ticks |
| `circlefeedback.md` | Living notes for the Circle hackathon feedback form (5-section structure) |
| `CHANGELOG.md` | Per-commit log — every change to Mtrly is captured here |
| `PRD.md` / `TECH_REFERENCE.md` | Product spec + Circle SDK reference |
| `DEMO.md` / `SUBMISSION.md` | Demo script + ready-to-paste submission copy |

## Run locally

```bash
git clone git@github.com:finecalex/mtrly.git
cd mtrly
cp .env.example .env   # fill CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET,
                       # MTRLY_DEMO_BUYER_KEY, MTRLY_USER_KEY_ENC, JWT_SECRET, ADMIN_SETUP_KEY
docker compose up -d
open http://localhost:3000
```

The Postgres schema migrates on container start (`prisma db push`). `MTRLY_USER_KEY_ENC` must be a 32-byte hex string for per-user EOA encryption.

## Circle products used

| Product | Where in Mtrly |
| --- | --- |
| **Arc Testnet** (chain 5042002) | Settlement layer for every nanopayment + auto-cashout mint |
| **USDC on Arc** | Both balance unit and gas token (no second token to teach) |
| **Circle Gateway** (`@circle-fin/x402-batching` v3.0.1) | Per-tick batched settlement; `depositFor` for custodial onboarding; `withdraw` for creator auto-cashout |
| **x402 facilitator** | HTTP 402 + EIP-3009 `transferWithAuthorization` per tick |
| **CCTP** | Observed during the Gateway batcher outage; deposit/withdraw fallback |
| **Arc Block Explorer** | Per-tx + per-address transparency surface — every UI proof links here |

See [`circlefeedback.md`](./circlefeedback.md) for what worked, what didn't, and what we'd recommend (status-page split, `transactionHash` in transfer responses, custodial-onboarding docs walkthrough, etc.).

## Known limitations / would-do-with-more-time

- **External videos & web articles must be unlisted-link-only.** Mtrly meters by detecting the URL with a browser extension or by registering it in our content table — but it can't *enforce* the paywall on YouTube or any external site. A creator who registers a public YouTube video keeps earning from Mtrly readers, but anyone who knows the URL can also watch it for free on the source site. For the hackathon scope we left this out; the proper fix is one of: (a) embedding our own player that gates playback, (b) requiring creators to upload to a private CDN we proxy, or (c) using YouTube unlisted links + obscuring the URL behind our extension's `match` flow. We surface this clearly to creators in the dashboard publish form.
- **Video engagement analytics** — currently shows "coming soon". Per-second engagement curves require per-second consumption tracking which our ledger doesn't carry yet (it tracks per-action units, fine for paragraphs).
- **`onchainTxHash` per nanopayment** — Circle's v3 SDK regression hides the real Arc tx hash from `getTransferById`/`searchTransfers`. We fall back to linking the platform Gateway address (where every batched settlement is publicly visible) until the SDK exposes the hash again. See `circlefeedback.md §C-2`.
- **`www.mtrly.xyz`** — apex `mtrly.xyz` works; the `www` cert is held back until a www DNS record exists (Let's Encrypt fails the entire multi-domain request when one host has no DNS).

## License

MIT — original code only, per hackathon rules. See [`LICENSE`](./LICENSE) for the full text.
