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

---

## 6. Changelog of this file

- **2026-04-23** — initial seed: §4.1 Gateway batcher outage, §4.2 missing tx-hash in v3
  SDK, §4.3 Next.js caching, §4.5 mainnet-default URL, §5.1 status-page split proposal.
