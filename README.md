# Mtrly — pay-per-second content on Arc Testnet

> Submission for **Agentic Economy on Arc** (Circle + lablab.ai · Apr 20–26, 2026).

**Live demo:** https://circlearc-59513674.slonix.dev
**Onchain proof:** https://testnet.arcscan.app/address/0x518dBC8D650666889575178E8f0bDDcDd68063B1
**Source:** https://github.com/finecalex/mtrly · MIT-licensed

---

## What it is

Mtrly meters attention by the second — **$0.05/min for video, $0.005/paragraph for text** — and settles every tick onchain on Arc Testnet via Circle Gateway. No subscriptions. No per-tick wallet popups. The same primitive bills a YouTube view, a blog read, or an article authored natively on Mtrly.

> Picture Spotify if you only paid for the seconds you actually listened, the receipt was on a public blockchain, and the artist got the cash within hours. That.

## Demo this in 60 seconds

1. **Open** [https://circlearc-59513674.slonix.dev](https://circlearc-59513674.slonix.dev)
2. **Sign up** — we auto-provision a Circle Wallet + an Arc Testnet EOA for you
3. **Read** [/a/5 — "Why nanopayments matter"](https://circlearc-59513674.slonix.dev/a/5) — first paragraph free, rest blurred until you sign in
4. **Browse** [/explore](https://circlearc-59513674.slonix.dev/explore) and [/leaderboard](https://circlearc-59513674.slonix.dev/leaderboard) — every creator's wallet is linked to arcscan
5. **Verify onchain** — click any creator → "Verify wallet on arcscan ↗" → see real settlement transfers

## Architecture (one diagram)

```
┌───────────┐     tick (HTTP)     ┌──────────────┐    settle (HTTP 402)    ┌────────────────┐
│  Viewer   │  ─────────────────► │  Mtrly API   │  ─────────────────────► │ Circle Gateway │
│ (browser) │                     │  (Next.js)   │                         │ (x402 facil.)  │
└───────────┘                     └──────────────┘                         └────────────────┘
     │                                  │                                          │
     │       Signed EIP-3009            │       Postgres ledger                    │   Batched
     │       (paymaster auth)           ▼       (offchain mirror)                  ▼   transfer
     │                                Balance / Payment / Consumption       Arc Testnet (USDC)
     │                                                                            │
     └──────────────── arcscan.app/tx/<hash> ◄────────────────────────────────────┘
                       (verifiable on chain)
```

- **Per-user EOA** for signing each tick (Phase 1 — see CHANGELOG). Platform funds each user's Gateway pool via `GatewayClient.depositFor(amt, userEoa)` so users don't need native gas.
- **Offchain ledger** debits viewer / credits creator / takes 20% platform cut atomically per tick in a Prisma transaction.
- **Onchain settlement** is a fire-and-forget Circle Gateway call after each Postgres commit — user response isn't blocked.
- **Native articles** (`/a/<id>`) use the same per-paragraph paywall as external content; the URL stays hidden from logged-out viewers so they can't bypass the meter.

## What's in the repo

| Path | Purpose |
| --- | --- |
| `web/` | Next.js 14 app (App Router, Prisma, Tailwind, shadcn-style primitives) |
| `web/app/api/x402/tick/route.ts` | The 402 endpoint that accepts batched payments |
| `web/lib/{billing,gateway,userWallet}.ts` | Tick engine + Circle Gateway client + per-user EOA store |
| `web/app/{explore,leaderboard,c,a,settings,balance,dashboard,how-it-works}` | Consumer + creator UI |
| `extension/` | Chrome MV3 extension that watches video/text and ticks |
| `circlefeedback.md` | Live notes for the Circle hackathon feedback form |
| `CHANGELOG.md` | Per-commit log — every change to Mtrly is captured here |
| `PRD.md` / `TECH_REFERENCE.md` | Product spec + Circle SDK reference |
| `DEMO.md` | Demo script for the hackathon submission video |

## Try it locally

```bash
git clone git@github.com:finecalex/mtrly.git
cd mtrly
cp .env.example .env  # fill CIRCLE_API_KEY, MTRLY_DEMO_BUYER_KEY, JWT_SECRET, etc.
docker compose up -d
open http://localhost:3000
```

The Postgres schema migrates on container start (`prisma db push`). Set `MTRLY_USER_KEY_ENC` to a 32-byte hex string to enable per-user signing keys.

## What we built specifically for this hackathon

- **Per-user tick-signing wallets** — every viewer gets their own viem EOA (encrypted server-side with AES-256-GCM); each onchain settlement names the actual viewer's address as `from`. No more "platform pays for everyone" demo cheat.
- **Native articles** — creators write paywalled text directly inside Mtrly; rendered with `<article> <p>` so the same extension paragraph-paywall works unmodified.
- **Auth-gated content URLs** — non-authed visitors of `/explore` and `/c/<slug>` see blurred previews + descriptions; the raw URL never leaves the server, so the meter cannot be bypassed.
- **Full onchain transparency surface** — `/balance`, `/dashboard`, `/c/<slug>`, `/a/<id>` all link to arcscan for the relevant wallet; lifetime-earnings + onchain-settlement counts are first-class card metrics.
- **Live ticker on home** — pulls completed Circle Gateway transfers in real time, every 5s.

## Circle products used

- **Arc Testnet** (chain 5042002) — settlement layer for all nanopayments
- **USDC on Arc** — native-gas stablecoin
- **Circle Gateway** (`@circle-fin/x402-batching` v3.0.1) — per-tick settlement via offchain aggregation + onchain batch publish
- **x402 facilitator** — HTTP 402 + EIP-3009 `transferWithAuthorization` per tick
- **CCTP** — observed, used for deposit/withdraw fallback

See `circlefeedback.md` for what worked, what didn't, and what we'd recommend.

## License

MIT — original code only, per hackathon rules. See `LICENSE` for the full text.
