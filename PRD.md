# PRD: Mtrly — Pay What You Consume

> Pronounced: **"meterly"** — from *meter* (счётчик per-second billing) + *meter* (поэтическая/музыкальная метра)
> Tagline: **"Content, metered by the second."**

> Hackathon: Agentic Economy on Arc (Apr 20–26, 2026)
> Track: Real-Time Micro-Commerce Flow + Per-API Monetization Engine

---

## 1. Problem

Creator subscription platforms (Patreon, YouTube Memberships) charge flat monthly fees regardless of consumption:

- Subscriber pays $10/mo, watches 20 minutes of content — overpays
- Subscriber pays $10/mo, watches 10 hours — creator underpaid per minute
- 40–60% of subscribers churn within 3 months because they feel they're not getting value
- Creators lose casual fans who won't commit to a monthly subscription

**Until now, per-second billing was economically impossible** — gas fees on traditional L1s ($0.01–$0.50/tx) exceed the value of sub-cent microtransactions.

## 2. Solution

**Mtrly** — a content platform where viewers pay per minute of video watched and per paragraph of text read. No subscriptions. No commitments. Pay exactly for what you consume.

Powered by Circle Nanopayments on Arc:
- Gas-free microtransactions (Circle covers settlement)
- Sub-cent pricing ($0.05/min)
- Instant revenue to creators in USDC
- Works for humans and AI agents (via x402)

## 3. Value Proposition

### For Viewers:
- Watch 10 min = pay $0.50 (not $10/mo subscription)
- No commitment — close tab, stop paying
- Discover new creators without subscribing
- Fair: pay only for content you actually consume

### For Creators:
- Monetize casual viewers who won't subscribe
- Higher per-minute revenue than YouTube ads ($0.05/min vs $0.002/min from ads)
- Instant payouts in USDC — no 30-day payment cycles
- Revenue from AI agents consuming content via x402

### For AI Agents:
- Programmatic access to premium content via x402
- No API keys, no subscriptions — pay per request
- Agent can autonomously decide which content to consume based on budget

## 4. Features (MVP for Hackathon)

### 4.1 Creator Dashboard

- Upload content:
  - **Video**: paste YouTube unlisted URL
  - **Text**: write/paste article in markdown
- Set price per unit (default: $0.05/min for video, $0.005/paragraph for text)
- View real-time earnings dashboard:
  - Total earned (USDC)
  - Active viewers right now
  - Transaction stream (live feed)
  - Per-content breakdown

### 4.2 Viewer Experience

#### Onboarding & Balance:
- Sign up / login (email or social)
- Top up platform balance: transfer USDC to platform dev-controlled wallet
  - Viewer chooses amount ($1, $2, $5, etc.)
  - Single onchain transaction (viewer signs once)
  - Balance appears in UI immediately
- Balance widget always visible: current balance, [+ Top Up], [Withdraw]
- Withdraw: viewer can pull remaining balance back to their external wallet at any time

#### Video:
- Browse content catalog
- Click to open → see preview (title, thumbnail, creator, price/min)
- Press Play (no wallet popup — balance already on platform)
- Video plays (YouTube iframe) → billing starts at play event
- Every 5 sec: backend auto-deducts $0.004 from viewer's platform balance → pays creator via Nanopayments
- Pause / stop → billing stops
- Live ticker on screen: time watched, amount spent, balance remaining
- Balance runs out → video auto-pauses → "Top up to continue" modal
- After watching 80%+ of video → content unlocked permanently (model C)

#### Text:
- Article page shows title + first paragraph free
- Rest is blurred
- Scroll down → each paragraph unblurs when in viewport for 3+ seconds
- Each unblur: backend deducts $0.005 from platform balance → pays creator
- Fast scroll (< 0.5s in viewport) = no charge
- Balance runs out → scroll stops revealing → "Top up to continue"
- After reading 80%+ paragraphs → article unlocked permanently

### 4.3 Platform Balance Model

Viewers hold a **platform balance** in USDC. This is a dev-controlled Circle Wallet managed by our backend. The viewer deposits once (single onchain tx), then all micropayments flow automatically without further approvals.

```
┌─ Viewer ──────────────────────────────────────────────────┐
│                                                           │
│  External Wallet (MetaMask / Circle User Wallet / etc.)   │
│       │                                          ▲        │
│       │ deposit (onchain, 1 tx)                  │        │
│       ▼                                  withdraw│        │
│  ┌─────────────────────────────┐                 │        │
│  │ Platform Balance            │                 │        │
│  │ (dev-controlled wallet)     │─────────────────┘        │
│  │ $2.00 USDC                  │                          │
│  └──────────┬──────────────────┘                          │
└─────────────┼─────────────────────────────────────────────┘
              │ every 5 sec (auto, no approval)
              ▼
┌─ Backend (GatewayClient) ─────────────────────────────────┐
│                                                           │
│  EIP-3009 sign → Circle Nanopayments API                  │
│       │                                                   │
│       ├──→ 80% to Creator wallet (Nanopayment)            │
│       └──→ 20% to Platform wallet (internal ledger)       │
│                                                           │
└───────────────────────────────────────────────────────────┘
              │ background, batched
              ▼
┌─ Circle Gateway ──────────────────────────────────────────┐
│  Aggregates N offchain payments → 1 onchain batch on Arc  │
│  Circle pays gas                                          │
└───────────────────────────────────────────────────────────┘
```

**Why this is not sketchy custodial:**
- Viewer chooses exactly how much to deposit ($1–$5, not $10/mo locked)
- Viewer can withdraw remaining balance at any time
- All payments are transparent: viewer sees every tick in real-time
- Platform never holds more than the viewer explicitly deposited
- Same model as any prepaid service (Uber credits, Steam Wallet, etc.)

### 4.4 x402 API Access (for AI Agents)

- `GET /api/content/{id}` → returns 402 Payment Required
- Agent pays via x402 header → receives content
- Video: returns transcript + metadata (agent doesn't need video stream)
- Text: returns full article text
- Per-request pricing: same as human consumption

### 4.5 Unlock Logic (Model C)

- Track consumption per user per content:
  - Video: % of duration watched (based on YouTube API currentTime / duration)
  - Text: % of paragraphs viewed (3+ sec each)
- When consumption >= 80% → mark as unlocked in DB
- Next visit: content loads fully, no payments, badge "Purchased"
- Creator can configure threshold (60%–100%) or disable (always pay)

## 5. Technical Architecture

### 5.1 Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Video Player | YouTube iframe API |
| Text Rendering | Markdown → React + Intersection Observer |
| Backend API | Next.js API Routes (or separate Node.js) |
| Database | PostgreSQL |
| Payments | `@circle-fin/x402-batching` (Nanopayments SDK) |
| x402 | x402 facilitator (for AI agent access) |
| Viewer Wallets | Dev-controlled Circle Wallets (platform balance) |
| Creator Wallets | External wallet (any EVM address) or dev-controlled |
| Platform Wallet | Dev-controlled Circle Wallet (collects 20% fee) |
| Blockchain | Arc testnet (chain ID: 5042002) |
| Auth | Email / social login → Circle user identity |
| Deploy | Docker Compose |

### 5.2 Data Model

```
users
  id, email, role (viewer|creator), name, avatar,
  circle_wallet_id,        -- dev-controlled wallet for platform balance
  circle_wallet_address,   -- on-chain address
  external_wallet_address, -- for withdrawals / creator payouts
  created_at

content
  id, creator_id, type (video|text), title, description,
  source_url (youtube), body (markdown), price_per_unit,
  unit_type (minute|paragraph), unlock_threshold (default 0.8),
  thumbnail, created_at

balances (app-level ledger, source of truth for UI)
  id, user_id, amount_usdc, last_updated_at

balance_transactions
  id, user_id, type (deposit|withdraw|payment_out|payment_in|platform_fee),
  amount_usdc, reference_id, created_at

consumption
  id, viewer_id, content_id, units_consumed,
  total_paid_usdc, is_unlocked, last_accessed_at

payments (Nanopayments log)
  id, consumption_id, from_user_id, to_user_id,
  amount_usdc, nanopayment_tx_id, settled_onchain (bool),
  created_at
```

### 5.3 Frontend Architecture

```
Pages:
/                       → Landing page + content catalog
/create                 → Creator: upload content
/dashboard              → Creator: earnings dashboard
/watch/{id}             → Viewer: video player + billing
/read/{id}              → Viewer: article reader + billing
/balance                → Viewer: top up / withdraw / history

API:
/api/auth/signup        → Create account + dev-controlled wallet
/api/auth/login         → Login
/api/balance/deposit    → Generate deposit address + monitor incoming tx
/api/balance/withdraw   → Withdraw remaining balance to external wallet
/api/balance/status     → Current balance
/api/billing/tick       → Billing tick (called every 5 sec by frontend)
/api/content/{id}       → x402 API for agents (returns 402 → pay → content)
/api/content/create     → Creator: publish content
/api/consumption/{id}   → Get unlock status for viewer+content
/api/dashboard/stats    → Creator: earnings, views, tx stream
```

### 5.4 Billing Logic

#### Video — Frontend (browser):
```javascript
// YouTube iframe API — detects play/pause
player.addEventListener('onStateChange', (event) => {
  if (event.data === YT.PlayerState.PLAYING) {
    startBillingInterval()  // every 5 seconds
  }
  if (event.data === YT.PlayerState.PAUSED ||
      event.data === YT.PlayerState.ENDED) {
    stopBillingInterval()
  }
})

// Every 5 sec → tell backend to charge
async function billTick() {
  const res = await fetch('/api/billing/tick', {
    method: 'POST',
    body: JSON.stringify({ contentId, sessionId }),
  })
  const { balance, totalSpent, error } = await res.json()

  if (error === 'INSUFFICIENT_BALANCE') {
    player.pauseVideo()
    showTopUpModal()
    return
  }
  updateTicker(balance, totalSpent)
  checkUnlockThreshold()
}
```

#### Video — Backend (server):
```typescript
// POST /api/billing/tick
import { GatewayClient } from "@circle-fin/x402-batching/client";

const gatewayClient = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.PLATFORM_WALLET_PRIVATE_KEY,
});

async function handleBillingTick(viewerId, contentId) {
  const viewer = await db.getUser(viewerId)
  const content = await db.getContent(contentId)
  const tickAmount = content.price_per_unit / 12  // $0.05/min ÷ 12 = ~$0.004

  // Check app-level balance
  if (viewer.balance < tickAmount) {
    return { error: 'INSUFFICIENT_BALANCE' }
  }

  // Pay creator 80% via Nanopayments (offchain, ~100ms)
  const creatorAmount = tickAmount * 0.8
  await gatewayClient.pay(content.creator.paymentEndpoint)

  // Update app-level balances
  await db.deductBalance(viewerId, tickAmount)
  await db.addBalance(content.creatorId, creatorAmount)
  await db.addBalance(PLATFORM_ID, tickAmount * 0.2)  // 20% platform fee

  // Log payment
  await db.logPayment({ viewerId, creatorId: content.creatorId, amount: tickAmount })

  return { balance: viewer.balance - tickAmount, totalSpent }
}
```

#### Text:
```javascript
// Intersection Observer on each paragraph
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      startTimer(entry.target.dataset.index)
    } else {
      cancelTimer(entry.target.dataset.index)
    }
  })
}, { threshold: 0.5 })

// Timer: if paragraph visible 3+ seconds → bill
function startTimer(paragraphIndex) {
  timers[paragraphIndex] = setTimeout(async () => {
    await billParagraph(paragraphIndex)  // $0.005
    unblurParagraph(paragraphIndex)
  }, 3000)
}
```

## 6. Demo Script (5-min pitch)

| Time | What | On Screen |
|------|------|-----------|
| 0:00 | Problem statement | "Patreon charges $10/mo. You watch 20 min. That's $0.50/min." |
| 0:30 | Solution intro | "Mtrly: pay $0.05/min. Only for what you watch." |
| 1:00 | Creator uploads video | Creator dashboard, paste YouTube URL, set price |
| 1:20 | Viewer opens video | Content page, preview, price/min shown |
| 1:30 | Viewer connects wallet, presses Play | Video starts, billing ticker appears |
| 1:50 | Live billing in action | Ticker updates every 5 sec: time, spent, tx count |
| 2:10 | Pause → billing stops. Play → resumes | Ticker freezes on pause, resumes on play |
| 2:30 | **Balance runs out mid-video** | Video auto-pauses, "Top up to continue" modal |
| 2:45 | Top up wallet → video resumes | Seamless continue, billing restarts |
| 3:00 | Switch to text article | Blurred article, first paragraph free |
| 3:20 | Scroll demo | Paragraphs unblur one by one, tx counter ticks |
| 3:40 | Creator dashboard | Real-time earnings stream, per-content breakdown |
| 4:00 | x402 demo | AI agent requests article via API, pays, receives text |
| 4:15 | Margin proof | "200 txs in this demo. On Ethereum: $2 gas. On Arc: $0." |
| 4:25 | Reopen video → already unlocked | "Purchased" badge, full access, no billing |
| 4:30 | Reopen video → already unlocked | "Purchased" badge, no payment |
| 4:45 | Vision | "Every piece of content, priced per second of attention" |
| 5:00 | End | Arc Explorer showing all transactions |

## 7. Hackathon Submission Alignment

| Requirement | How We Meet It |
|------------|----------------|
| Per-action pricing ≤ $0.01 | Video: $0.05/min = $0.00083/sec. Text: $0.005/paragraph |
| 50+ onchain transactions | 5 min video demo = 5 txs + 20 paragraph article = 20 txs + agent calls = 50+ easily |
| Margin explanation | $0.05/min billing requires 300 txs/hour. Eth gas @ $0.01/tx = $3/hr overhead = impossible. Nanopayments = $0 |
| Transaction flow video | Show Circle Console tx → verify on Arc Explorer |
| Circle product feedback | Document Nanopayments SDK, Wallets, x402 experience |

## 8. Revenue Model (for pitch)

| Metric | Value |
|--------|-------|
| Creator share | 80% |
| Platform share | 20% |
| Avg video length | 15 min |
| Avg revenue per view | $0.75 |
| 1000 viewers/video | $750 per video ($600 creator, $150 platform) |
| Infrastructure cost | ~$0 (Nanopayments gas-free) |

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Nanopayments SDK still in testnet — may have bugs | Start integration early, have fallback mock mode |
| YouTube may block iframe in some cases | Test early, have 1-2 backup videos ready |
| Circle Wallets onboarding friction | Pre-fund test wallets for demo |
| Low tx count in demo | Add auto-play demo mode that cycles through content |

## 10. Timeline

| Day | Focus |
|-----|-------|
| Apr 20 (Mon) | Setup: repo, Docker, DB, Next.js scaffold, Circle account |
| Apr 21 (Tue) | Core: Nanopayments integration, wallet connection, billing logic |
| Apr 22 (Wed) | Video: YouTube player + per-minute billing + unlock logic |
| Apr 23 (Thu) | Text: article reader + per-paragraph billing + blur/reveal |
| Apr 24 (Fri) | Creator dashboard, x402 API, polish UI |
| Apr 25 (Sat) | Demo prep, submission video, testing, bug fixes |
| Apr 26 (Sun) | Submit, pitch |

## 11. Name Options

- **Mtrly** — pay drop by drop (primary)
- **Sip** — consume bit by bit
- **Metr** — metered content
- **Tick** — every tick costs a fraction
