# Circle Product Feedback — Mtrly

> Living document. Every commit that touches Circle integration SHOULD add an entry here
> (success, friction, bug, or idea). Final hackathon submission copies the best items into
> the Circle Feedback form.

---

## 1. Products Used

- **Arc Testnet (chain 5042002)** — settlement layer for all nanopayments
- **USDC on Arc** — native-gas stablecoin, used as both balance unit and gas token
- **Circle Gateway (`@circle-fin/x402-batching` v3.0.1)** — per-tick settlement via off-chain aggregation + on-chain batch publish
- **x402 facilitator (HTTP 402 Payment Required)** — per-request payment verification for our `/api/x402/tick` endpoint
- **CCTP** — observed working on Arc testnet during Gateway batcher outage (verified via arcscan deposit/burn/mint txs)

Not yet used (considered): Circle Wallets (we bring our own EOA for demo), Bridge Kit, Circle Mint.

---

## 2. Use Case

Mtrly is a pay-per-second content platform — viewers pay ~$0.005 per video-minute or per
paragraph. That demands high-frequency sub-cent transactions which are economically
impossible with traditional L1 gas. We picked the Circle stack because:

- **Arc + native-USDC gas** eliminates the "pay gas in ETH/MATIC" UX tax — the meter and
  the gas token are the same asset.
- **Gateway batching** makes $0.005 settlement viable: thousands of ticks compress into a
  single on-chain transfer, so the per-tick effective gas cost is tiny.
- **x402** gives us HTTP-native per-request payments, which matches our per-tick mental
  model exactly and should generalize to agent-to-agent commerce (future roadmap).

---

## 3. Successes

- **`depositFor(amount, depositor)` is exactly the right primitive for custodial onboarding.** Once we moved from "platform is the sole x402 buyer" to "each user has their own EOA", we needed a way for the platform to seed each user's Gateway pool without forcing the user to hold native gas or do a faucet dance. `GatewayClient.depositFor(amount, userEoa)` does this in one call — platform pays gas, user becomes the owner of the resulting Gateway balance. This enables a realistic custodial prototype where every onchain tick is signed by the actual viewer's key (visible per-user on arcscan) while the platform absorbs the gas overhead. Huge DX win vs. implementing a smart account or per-user deposit contract ourselves. (Used in `POST /api/admin/fund-user-eoa`.)
- **`BatchEvmSigner` interface is minimal (`{ address, signTypedData }`)** — this makes it trivial to wrap non-local signers (Circle Wallets, KMS-backed keys, hardware wallets) around the same `GatewayClient` flow. We're keeping this for Phase 2 so Circle Wallets can drive the same x402 path without us forking SDK internals.
- **v3.0.1 SDK upgrade** from v2.1 was mechanical — only the mainnet-default URL change
  required an env-configurable override. Good breaking-change semantics.
- **`searchTransfers` by `status` + `from` filters** are exactly the right shape for a
  dashboard — we built a per-status counts panel in ~40 lines.
- **x402 facilitator `verify` + `settle`** is clean: pass EIP-3009 payload, get back a
  UUID. No custom onchain plumbing needed.
- **Arcscan (testnet.arcscan.app)** resolves addresses and hashes reliably. Makes the
  transparency story ("view settlement proof ↗") easy to build.
- **CCTP on Arc testnet** is rock-solid even when the Gateway batcher regressed — our
  deposit/withdraw flow never lost a cent during 65h of batcher downtime.
- **Arcscan address pages double as a creator-discovery proof-of-work signal.** When we built `/c/[slug]` (public creator profile à la Patreon), the most compelling "this is real" signal we could surface is just a deep link to `testnet.arcscan.app/address/<creator-EOA>`. Visitors click through, see real onchain history, and trust the platform without any extra UI plumbing on our side. Free credibility from Circle's existing infrastructure.
- **Per-content `payment.count({settledOnchain: true})` aggregates** turn out to be the killer signal for a leaderboard. Ranking creators by lifetime USDC alone would also work, but the "N onchain" badge next to each creator on `/leaderboard` is what turns the page from a vanity scoreboard into "these are real Arc Testnet settlements". Got this almost for free thanks to how the SDK exposes settlement state on each Payment row.
- **`POST /api/balance/top-up-gateway-pool` end-to-end loop on a single button click.** Once Phase 1 (per-user EOAs) was in place, wiring the consumer-side "Fund pool" button on `/balance` was a 60-line endpoint: read user's internal balance, decrement, call `platform.depositFor(amount, user.ownedEoaAddress)`, refund-on-error. Worked first try after the txpool issue cleared. The same primitive that solved custodial onboarding (depositFor) doubles as the user's onchain "I am taking custody of this USDC" action — without us having to teach users about gas, contract approvals, or chains.
- **Returning fields: `{ depositTxHash, approvalTxHash, formattedAmount, depositor }` from `depositFor`** is the right shape for surfacing transparency. We piped both hashes straight into `Payment.referenceId` + the `arcscan ↗` link in the user's recent-transactions list — zero post-processing.

---

## 4. Challenges

### 4.1 Arc Testnet Gateway batcher outage (Apr 20 → Apr 23, 2026)
The single biggest friction during the hackathon. From **2026-04-20 18:59 UTC** to
**2026-04-23 17:11 UTC** (~70 hours, covering the bulk of the hackathon coding window),
the Gateway batcher published **zero** `completed` transfers on Arc testnet. During that
window:

- Our 31 `received` and 25 `batched` transfers stuck without progress, eventually all
  moving to `failed` (we ended up with 65 failed and 0 completed).
- Global search (`searchTransfers` with no `from` filter) confirmed it was network-wide:
  ~8-10 other EOAs were stuck in identical patterns.
- Base Sepolia was healthy the whole time (completed arriving ~40 min after settle).
- Circle status page (`status.circle.com`) reported "Arc Cross-Chain Minting and Burning:
  operational" at 100% the entire time — because that component tracks **CCTP**, not
  Gateway batch-publish. There's no status-page component for the Gateway publisher.

**Recommendation:** see §5.1.

### 4.2 `getTransferById` / `searchTransfers` response omits on-chain tx hash (v3.0.1)
We expected `completed` transfers to include a `transactionHash` / `txHash` field so we
could deep-link from our UI into `arcscan.app/tx/<hash>`. In v3.0.1 the response shape
is:

```json
{
  "id", "status", "token", "sendingNetwork", "recipientNetwork",
  "fromAddress", "toAddress", "amount", "createdAt", "updatedAt"
}
```

No hash. So we had to build our "view onchain proof" link as
`arcscan.app/address/<EOA>` (shows all batches to/from our platform address) instead of
per-nanopayment deep links. This weakens the per-payment transparency story.

We have a `gateway/resolve` background job that tries to backfill hashes (`raw.transactionHash
?? raw.txHash`) — it has been returning nothing since the upgrade.

### 4.3 Next.js caching of Gateway status reads
By default Next.js App Router caches GET responses. We had to explicitly add
`export const dynamic = "force-dynamic"; export const revalidate = 0;` to
`/api/gateway/status` or we'd render a stale snapshot for 60s after each fetch. Not a
Circle bug, but worth flagging in the quickstart docs because every serious app will
hit it.

### 4.4 `searchTransfers` `pageSize` max is 100
For dashboards that want "lifetime totals" we need to paginate. Documented pagination
(cursor / page token) would help — right now you just get 100 rows and a `Link` header
you have to parse yourself.

### 4.5 Default URL in `BatchFacilitatorClient` silently points at mainnet
Post-v3 upgrade, anyone who doesn't set `{ url }` ships their testnet app against
mainnet (which then 404s because testnet service IDs aren't there). The stack trace gives
no hint that the chain mismatch is the root cause. We got bitten briefly; docs should
call this out in bold in the migration notes.

### 4.7 `GatewayClient` singleton enters a bad nonce state after a failed `withdraw()` call (2026-04-25)
When `GatewayClient.withdraw()` throws (network error, Arc transient fault, etc.), the
client's internal nonce tracker is left incremented even though no tx was confirmed. Every
subsequent call from the same singleton fails with a nonce-mismatch error, creating an
infinite retry storm when auto-cashout refunds the balance and the next tick immediately
re-triggers the threshold check. We observed 50+ cascading failed `BalanceTransaction`
rows in 5-second intervals for a single creator, all with error `auto-withdraw:failed-refunded`
(reason not captured at the time). Root cause was confirmed by noting that a container
restart (fresh singleton) immediately produced a successful withdrawal.

**Workaround we shipped:** call `resetGatewayClient()` after any withdrawal failure and add
a 60-second in-process cooldown per creator before retrying. This stops the storm and
gives the nonce time to sync.

**Recommendation:** `GatewayClient.withdraw()` should either (a) reset its own nonce
cache on a failed tx so the next call re-fetches from chain, or (b) expose a `reset()`
method that callers can invoke after a caught error. Without this, any app that wraps
`withdraw()` in retry logic will cascade.

### 4.6a `eth_sendRawTransaction` returns "txpool is full" on Arc Testnet RPC during fund-user-eoa testing (2026-04-25)
While building Phase 1 of our consumer flow (per-user EOA tick wallets), the platform's `GatewayClient.depositFor(amount, userEoa)` call kept failing with `Details: txpool is full` from `https://rpc.testnet.arc.network`. The approval tx (`approve(GatewayWallet, 50000)` for $0.05) couldn't be submitted at all — error returned at the RPC layer, not in the contract. Reproduced 3x in 90 seconds. Same platform EOA had been successfully sending x402 settlement txs minutes earlier. This isn't an SDK bug, but it does block onboarding flows that rely on `depositFor` — there is no way for an SDK consumer to detect "RPC node mempool saturated" vs. "I have a real bug" from the error message alone. Suggestion: surface mempool-fullness as a typed error the SDK can retry on (with backoff), or document the expected throughput / mempool depth of the public Arc Testnet RPC so devs know to use a private node for high-volume periods.

### 4.6 Status lifecycle naming
`received` → `batched` → `confirmed` → `completed` → `failed` is four states too many
for a UI. We ended up explaining each one in hover-tooltips. A shorter lifecycle
(`pending` → `settled` / `failed`) would cover most use cases.

---

## 5. Recommendations

### 5.1 Gateway batcher health on the status page
Split the `ARC` entry on `status.circle.com` into at least:
- **Arc — CCTP** (burn/mint — currently already tracked)
- **Arc — Gateway batch publisher** (the subsystem that failed silently for 70h)
- **Arc — x402 facilitator** (verify/settle endpoint health)

When the batch publisher goes down, `verify`/`settle` still return 200 OK, so no API
ping will catch it. The only signal is "completed-count-per-hour dropped to zero", which
needs an internal SLO-style check feeding the public status page.

### 5.2 Add `transactionHash` to transfer responses
Return the on-chain batch tx hash in `getTransferById` / `searchTransfers` once a
transfer reaches `completed`. This unlocks per-nanopayment arcscan deep links, which is
a flagship demo moment for any payment product.

### 5.3 First-class cursor pagination on `searchTransfers`
A documented `pageToken` would make dashboards with "all-time stats" much simpler.

### 5.4 `BatchFacilitatorClient({ chain: "arcTestnet" })` inferring URL
Let developers pass the chain and have the SDK pick the right URL. Today you have to
know that arcTestnet lives at `gateway-api-testnet.circle.com`. Right now the SDK takes
`{ chain }` for the signer but `{ url }` for the facilitator, which is surprising
asymmetry.

### 5.5 Testnet faucet rate limits (Arc)
`faucet.circle.com` throttles heavily during active hackathons. For our demo we need
~$1 of testnet USDC per day of testing, but the faucet capped us at $0.50 / 24h per
address, forcing address rotation. A hackathon-mode faucet with known-good hackathon
addresses would help.

### 5.6 Docs: "what happens between batched and completed" is a black box
We had to search Circle Discord + GitHub + blog for 4 hours to understand:
- Batcher runs approximately every 2h at the top of the hour on testnet
- Once `batched`, publish depends on Arc node health, not on our code
- There is no exposed retry / escalation path if `batched` → stuck

A single docs page explaining the batch lifecycle with typical timings would save every
hackathon team days of confusion.

### 5.7 First-class "depositFor" guidance for custodial onboarding
The `depositFor(amount, depositor)` primitive is genuinely the linchpin of any custodial
prototype that wants per-user onchain proof — but it shows up in the SDK README as one
line under "buyer client methods" with no narrative about *why* it matters. We'd recommend
a "Custodial onboarding pattern" section in the docs that walks through:

  1. Provision a per-user EOA server-side (with caveats about key management)
  2. Platform funds each user's Gateway pool via `depositFor(amt, userEoa)`
  3. Each user's `GatewayClient` signs ticks from their own pool
  4. arcscan now shows real per-user onchain activity, not just a single platform key

We figured this pattern out by reading SDK type defs. A docs walkthrough (with the same
arcscan-verifiability claim spelled out as a benefit) would make this an obvious choice
for anyone building consumer-facing apps on Gateway.

---

## 6. Changelog of this file

- **2026-04-25** — §3 added `top-up Gateway pool from balance` end-to-end success;
  `depositFor` return shape success. §4.6a Arc RPC `txpool is full` from Phase 1
  fund-user-eoa. §5.7 "depositFor for custodial onboarding" docs recommendation.
- **2026-04-24** — §3 added `depositFor` success + `BatchEvmSigner` minimal-interface success after implementing Phase 1 per-user EOA flow
- **2026-04-23** — initial seed: §4.1 Gateway batcher outage, §4.2 missing tx-hash in v3
  SDK, §4.3 Next.js caching, §4.5 mainnet-default URL, §5.1 status-page split proposal.
