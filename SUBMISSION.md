# Mtrly — lablab.ai submission text

> Ready-to-paste copy for each form field of the **Agentic Economy on Arc**
> submission at https://lablab.ai/event/nano-payments-arc.

---

## Project name
**Mtrly** (pronounced "meterly")

## One-liner / tagline
Pay-per-second content metered through Circle Gateway on Arc Testnet — no subscriptions, no per-tick wallet popups, full onchain transparency.

## Track(s) entered
1. **Real-Time Micro-Commerce Flow** (primary)
2. **Per-API Monetization Engine** (the `/api/x402/tick` endpoint *is* a per-API metered service)
3. **Product Feedback Incentive** (see `circlefeedback.md` — 70+ live observations)

## Live demo
- **Web app:** https://circlearc-59513674.slonix.dev
- **Demo article:** https://circlearc-59513674.slonix.dev/a/6
- **Creator profile:** https://circlearc-59513674.slonix.dev/c/mtrly-studio
- **Leaderboard:** https://circlearc-59513674.slonix.dev/leaderboard
- **Onchain proof (platform settlement EOA on Arc Testnet):**
  https://testnet.arcscan.app/address/0x518dBC8D650666889575178E8f0bDDcDd68063B1

## Source code
https://github.com/finecalex/mtrly · MIT-licensed

---

## Project description (1–2 paragraphs)

Mtrly meters attention by the second of video or by the paragraph of text and settles every tick onchain on Arc Testnet via Circle Gateway. Viewers top up a USDC balance once; from then on, watching a registered YouTube video debits **$0.05/min** and reading a paragraph debits **$0.005** the moment that paragraph scrolls into view. The same per-tick primitive bills external content (via a Chrome extension that paywalls third-party pages) and articles authored natively inside Mtrly (`/a/<id>`, server-rendered with `<article> <p>` so the same extension paywall logic works unchanged). 80% goes to the creator, 20% to the platform — both atomically debited inside a Postgres transaction, then a fire-and-forget Circle Gateway call settles the same amount onchain so the user response isn't blocked.

What's distinctive: every viewer has their *own* tick-signing EOA on Arc Testnet (provisioned at signup, encrypted server-side with AES-256-GCM, funded via `GatewayClient.depositFor(amount, userEoa)` so users never need native gas), so each onchain settlement names the actual viewer's address as `from`. The leaderboard, creator profiles, and article footers all link directly to arcscan for the relevant wallet; "lifetime earned" and "onchain settlement count" are first-class metrics across the consumer surface. There's no demo cheat where one platform key signs every transfer — judges can pick any active creator and verify that real, separately-keyed user transactions are flowing in.

---

## How it uses Circle products

| Circle product | Role in Mtrly |
| --- | --- |
| **Arc Testnet** (chain 5042002) | Settlement layer for every tick |
| **USDC on Arc** (native gas) | Both the unit of account *and* the gas token — sub-cent payments are economically coherent only because of this |
| **Circle Gateway** (`@circle-fin/x402-batching` v3.0.1) | Per-tick settlement; thousands of offchain ticks compress into one onchain batch transfer |
| **x402 facilitator** | HTTP 402 + EIP-3009 `transferWithAuthorization` — each viewer's EOA signs each tick; we verify and settle through Circle's facilitator |
| **Circle Wallets** (`@circle-fin/developer-controlled-wallets` v8.0.0) | Per-user custodial wallet auto-provisioned at signup (alongside the local EOA used for tick signing) |
| **CCTP** | Observed on Arc Testnet during a 70h Gateway batcher outage — kept the deposit/withdraw path working through the regression |

`GatewayClient.depositFor(amount, depositor)` is the single primitive that lets the platform fund each user's Gateway pool without the user holding gas — it's the thing that makes a custodial-feeling onboarding compatible with onchain-verifiable, separately-signed settlements. We can't overstate how important this was.

---

## Technical architecture

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

- **Per-user EOA**: viem `generatePrivateKey()` at signup, encrypted with AES-256-GCM via `MTRLY_USER_KEY_ENC` (32-byte hex). Each user's `GatewayClient` is per-userId-cached in `lib/userWallet.ts`.
- **Offchain ledger**: Prisma transaction debits viewer / credits creator / takes 20% / writes a Payment row, all atomic. `applyTick()` in `web/lib/billing.ts:28`.
- **Onchain settlement**: fire-and-forget after Postgres commits — `settleTickViaGateway({amountUsdc, buyerClient: userClient ?? platformClient})`. User response isn't blocked.
- **Native articles**: `kind=mtrly` ContentUrl rows with `bodyMarkdown` (Postgres `Text`); rendered server-side at `/a/<id>` with paragraphs as `<p data-mtrly-paragraph={i}>` so the existing extension paywall logic works unchanged.
- **Auth-gated content URLs**: non-authed visitors of `/explore` and `/c/<slug>` see blurred previews + descriptions; raw URLs never leave the server, so the meter cannot be bypassed.

Repo: Next.js 14 App Router · Prisma + Postgres · Tailwind · custom shadcn-style primitives · Chrome MV3 extension · Docker Compose deployment.

---

## What we built specifically for this hackathon

1. **Per-user tick-signing wallets (Phase 1).** Verifiable onchain proof that real viewers — not a single platform key — are signing each settlement.
2. **Native articles authored on Mtrly.** Creators don't need to host content elsewhere; they write directly inside Mtrly and the same paragraph-meter applies.
3. **Auth-gated content URLs + blurred previews.** Closes the bypass loophole where a guest could just open the YouTube link directly.
4. **Onchain transparency surface.** `/balance`, `/dashboard`, `/c/<slug>`, `/a/<id>`, `/leaderboard` all link to arcscan; lifetime-earnings + onchain-settlement counts are first-class card metrics.
5. **Live ticker on home.** `/api/activity` aggregates real Circle Gateway transfers in real time.
6. **Top-up Gateway pool from balance.** User clicks one button on `/balance` and their internal Mtrly balance is moved to their own onchain Gateway pool — completes the loop where every onchain tick is signed by the viewer's own EOA, not the platform's.
7. **Consumer surface end-to-end.** `/explore`, `/leaderboard`, `/c/<slug>`, `/a/<id>`, `/settings`, `/how-it-works`, mobile nav, OG images, share rows.

---

## Successes (highlights — see `circlefeedback.md` for full list)

- **`depositFor(amount, depositor)` is exactly the right primitive for custodial onboarding.** Lets the platform seed each user's Gateway pool without the user holding gas. Enables a realistic prototype where every onchain tick is signed by the actual viewer's key (visible per-user on arcscan) while the platform absorbs gas overhead.
- **`BatchEvmSigner` interface is minimal** (`{ address, signTypedData }`) — easy to wrap non-local signers (Circle Wallets, KMS, hardware) around the same `GatewayClient` flow.
- **Arcscan address pages double as a creator-discovery proof-of-work signal.** Free credibility from Circle's existing infrastructure for the `/c/<slug>` profile pages.
- **Per-content `payment.count({settledOnchain:true})` aggregates** are the killer signal for a leaderboard — turn the page from a vanity scoreboard into "these are real Arc Testnet settlements."
- **CCTP on Arc Testnet stayed rock-solid** even when the Gateway batcher regressed for 70h (Apr 20–23, 2026).

## Challenges (highlights)

- **Arc Testnet Gateway batcher outage (Apr 20–23, 2026, 70h).** `verify` and `settle` returned 200 OK while the batch publisher was silently down — no API signal, only arcscan staleness. Multiple builders flagged this. Recommendation: split the `ARC` status-page entry into CCTP / Gateway batch publisher / x402 facilitator subsystems.
- **`getTransferById` / `searchTransfers` v3.0.1 response omits `transactionHash`.** v2.1 included it. We had to scrape arcscan to populate `Payment.onchainTxHash`. (See §4.2 in `circlefeedback.md`.)
- **`BatchFacilitatorClient` default URL silently became mainnet in v3.** Took us a debug session before we noticed. Should be the explicit-pick — there's no "obvious default" for a multi-chain SDK. (See §4.5.)
- **Arc Testnet RPC public endpoint hits "txpool is full" under modest load.** No SDK retry semantics for this; opaque to consumers. (See §4.6a.)

## Recommendations (sample)

1. **Split Gateway status page** by subsystem (Gateway batcher / CCTP / x402 facilitator).
2. **Add `transactionHash` back** to `getTransferById` / `searchTransfers` v3 responses.
3. **First-class cursor pagination on `searchTransfers`** (current `pageSize` max = 100).
4. **Auto-detect chain from `chain` arg in `BatchFacilitatorClient`** (don't default to mainnet).

Full text: see `circlefeedback.md` in the repo.

---

## Future plans (post-hackathon)

- **Phase 2: Circle-Wallets-driven deposit.** Let each user's Circle Wallet hold testnet USDC and execute the `depositFor` contract call via `createContractExecutionTransaction` — currently we use a server-side platform EOA for the Gateway top-up. Same on-chain effect, but the funding signature comes from the user's own Circle Wallet. (Deferred from hackathon scope due to Arc RPC mempool instability we hit during Phase 1 testing.)
- **Production-grade rate-limiting** per (viewer, creator) pair + challenge-response proofs of human attention to block bot-driven self-payment loops.
- **Search across creators + tags + categories** (currently only content text search).
- **Notifications** when a creator gets paid / when a viewer hits an unlock threshold.
- **Article series** (multi-part articles linked together with shared metering).
- **OG image previews** that include 7-day trending stats (currently show lifetime).
- **Dispute window** before offchain settlements push onchain via x402 batch.

---

## Team

Solo build during the hackathon week (Apr 20–26, 2026).

## Demo video

See `DEMO.md` for the screen-recorded walkthrough script. (60-second guided demo covering signup → article reading → leaderboard → onchain verification.)

## License

MIT — original code only, per hackathon rules. See `LICENSE`.
