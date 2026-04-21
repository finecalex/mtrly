# Mtrly — Demo Guide

**Live:** https://circlearc-59513674.slonix.dev
**Repo:** https://github.com/finecalex/mtrly
**Hackathon:** Agentic Economy on Arc · Apr 20–26, 2026

---

## 60-second demo script

### 1. Install the extension

**Fastest:** download the prebuilt zip and unzip it:

```
https://circlearc-59513674.slonix.dev/mtrly-extension.zip
```

Then in Chrome: `chrome://extensions/` → **Developer mode** → **Load unpacked** → select the unzipped folder.

Alternatively, from the repo:

```bash
git clone git@github.com:finecalex/mtrly.git
```

…and point "Load unpacked" at `mtrly/extension/`.

### 2. Sign up

Open the popup → **Log in** → on the login page click **Sign up**.

- Email, password, display name, role (Viewer)
- Submit → backend creates user + provisions an Arc-testnet EOA via Circle&apos;s developer-controlled-wallets SDK
- You land on `/balance` with a live wallet address like `0xec76a8…005b6ee`

### 3. Top up your balance (testnet demo path)

For the hackathon we bypass the onchain deposit watcher with an admin endpoint:

```bash
curl -X POST https://circlearc-59513674.slonix.dev/api/admin/grant-balance \
  -H "x-admin-setup-key: $ADMIN_SETUP_KEY" \
  -H "content-type: application/json" \
  -d '{"email":"<your-email>","amountUsdc":1.0}'
```

(Production path: Circle Nanopayments onchain deposit monitor → crediting on USDC ERC-20 receipt at `0x3600…0000` on Arc chain 5042002.)

### 4. Watch a registered YouTube video

Visit https://www.youtube.com/watch?v=dQw4w9WgXcQ (pre-seeded).

- Mtrly side panel appears top-right
- Press Play → the meter starts ticking every 5 seconds
- Balance counts down by ~$0.00417 per tick
- Pause the video → meter pauses
- Let the balance run out → overlay pops up with a "Top up" button

### 5. Read a registered article

Visit https://circlearc-59513674.slonix.dev/demo/article.

- First paragraph reads normally
- Remaining paragraphs are blurred with a `mtrly · $0.005` badge
- Scroll slowly, rest your eyes on a blurred paragraph for 3 seconds → it unblurs and $0.005 is debited
- Refresh the page — paragraphs you&apos;ve paid for stay unblurred (backed by the `Consumption` table, not local storage)

### 6. Creator side

Log in as the creator account (`creator1@test.mtrly / creatorpass123` in the seeded demo).

- `/dashboard` shows live balance, lifetime earned (creator&apos;s 80% share), 5-second polling
- Per-content table: sessions, unique viewers, earned-per-URL
- Recent payments list — every viewer tick creates a `Payment` row
- Form to register new URLs (YouTube or any web page)

---

## Money flow, in one diagram

```
Viewer balance ─── tick ($0.00417 video | $0.005 text) ───▶
                        │
                        ├── 80% ─▶ Creator balance    (Payment + BalanceTransaction[payment_in])
                        └── 20% ─▶ Platform account   (BalanceTransaction[platform_fee])
```

All three sides are updated inside a single Prisma `$transaction`. Insufficient balance returns HTTP 402 and the extension pauses playback.

## Architecture

- **Web app** — Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL
- **Auth** — jose HS256 JWT cookie (`SameSite=None; Secure`, 30d), bcrypt passwords
- **Wallets** — `@circle-fin/developer-controlled-wallets` v8, Arc testnet EOAs, one per user
- **Chain** — Arc testnet (chain 5042002, USDC-native gas, RPC `rpc.testnet.arc.network`)
- **Billing** — offchain ledger (Prisma tables). Onchain Nanopayment settlement = next phase
- **Extension** — Chrome MV3; `background.js` service worker + `content.js` injected everywhere; cross-origin fetch with `credentials: "include"`

## Repo layout

```
/web             Next.js app
  /app           App Router pages + /api routes
  /lib           auth, circle client, wallet provisioning, billing engine, URL normalizer
  /prisma        schema
/extension       Chrome MV3 extension
/.ssh-deploy     (gitignored) SSH deploy key
/PRD.md          full product spec
/HACKATHON_BRIEF.md
/TECH_REFERENCE.md
/CHANGELOG.md    per-commit change log
```

## What&apos;s next (post-hackathon)

- Onchain USDC deposit watcher on Arc testnet (poll ERC-20 `Transfer` logs to each user&apos;s EOA)
- x402 / Circle Nanopayment batch settlement — convert the offchain `Payment` rows into onchain USDC transfers
- Creator payout / withdraw flow (Circle `createTransaction` to user-provided external address)
- Rate-limits + anti-collusion: per-viewer-per-creator cooldowns, challenge-response proofs of human attention
- Extension UX: persistent dock, cost-prediction before pressing Play, per-domain quota, offline queue
