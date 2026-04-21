# Agentic Economy on Arc — Hackathon Brief

> **Source:** https://lablab.ai/ai-hackathons/nano-payments-arc
> **Scraped:** 2026-04-16

---

## Overview

- **Name:** Agentic Economy on Arc
- **Tagline:** The Agent Economy Built for Sub-Cent Transactions
- **Dates:** April 20–26, 2026
- **Format:** Hybrid (Online + On-site in San Francisco)
- **Prize Pool:** $10,000 in USDC
- **Participants:** 743+ registered
- **Organizers:** Circle (NYSE: CRCL), Arc, lablab.ai, NativelyAI

---

## What to Build

Build an application, agent, or developer tool that leverages **programmable USDC** and **Nanopayments** for economically viable transactions to unlock new economic models for APIs, AI Agents, marketplaces, or machine-to-machine commerce.

---

## Challenge Tracks

### 1. Per-API Monetization Engine
Build an API that charges per request using USDC, demonstrating viable per-call pricing at high frequency.

### 2. Agent-to-Agent Payment Loop
Create autonomous agents that pay and receive value in real time, proving machine-to-machine commerce without batching or custodial control.

### 3. Usage-Based Compute Billing
Design an application that charges per query, per compute unit, or per task with real-time settlement aligned to actual usage.

### 4. Real-Time Micro-Commerce Flow
Build a buyer or seller experience where economic activity is triggered and settled per interaction, not per subscription.

### 5. Product Feedback Incentive (bonus)
$500 USDC in rewards to teams with most detailed and helpful feedback in submission form.

> **Note:** You must align your project with at least one track. Winners are selected based on the best overall solutions, regardless of track.

---

## Mandatory Requirements (ALL submissions)

1. **Real per-action pricing ≤ $0.01** — demonstrate sub-cent transactions
2. **50+ onchain transactions in demo** — show transaction frequency data
3. **Margin explanation** — why this model would fail with traditional gas costs
4. **Transaction Flow Video** — end-to-end USDC transaction via Circle Developer Console + verification on Arc Block Explorer
5. **Original code, MIT-compliant**

---

## Required Tech Stack

### Must Use:
- **Arc** — EVM-compatible Layer-1, all transactions settle here
- **USDC** — native gas token and stablecoin on Arc
- **Circle Nanopayments** — sub-cent, gas-free, high-frequency transactions

### Recommended:
- **Circle Wallets** — primary wallet infrastructure for users and agents
- **Circle Gateway** — unified USDC balance accessible crosschain
- **Circle Bridge Kit** — moving USDC across chains

### 3rd Party Tools:
- **x402** — web-native payment standard (HTTP 402), facilitator for verifying/submitting payments
- **Vyper tooling:**
  - circle-titanoboa-sdk (Vyper + Titanoboa + x402)
  - vyper-agentic-payments (agent-driven payment flows)
  - ERC-8004-vyper (trust layer for autonomous agents — identity, reputation, validation)

### Digital Resources (AIsa):
- Premium real-time data services and APIs via Circle Nanopayments + x402
- Per-request monetization examples on GitHub

### Developer Resources:
- Arc Documentation
- Nanopayments Documentation
- Circle Documentation
- Circle Github
- Circle Developer Account (register with same email as hackathon)
- Testnet faucet
- Circle Developer Blog

---

## Prizes

### On-site (San Francisco):
| Place | Prize |
|-------|-------|
| 1st | $3,000 USDC |
| 2nd | $1,500 USDC |
| 3rd | $1,000 USDC |

### Online:
| Place | Prize |
|-------|-------|
| 1st | $2,500 USDC |
| 2nd | $1,500 USDC |

### Additional:
- **Product Feedback Incentive:** $500 USDC (best feedback in submission form)

> Prize distribution may take up to 90 days.

---

## Judging Criteria

| Criterion | Description |
|-----------|-------------|
| **Application of Technology** | How effectively the chosen model(s) are integrated into the solution |
| **Presentation** | The clarity and effectiveness of the project presentation |
| **Business Value** | The impact and practical value, how well it fits into business areas |
| **Originality** | The uniqueness & creativity of the solution, highlighting novel approaches |

---

## Submission Checklist

### Basic Information:
- Project Title
- Short Description
- Long Description
- Technology & Category Tags

### Media:
- Cover Image
- Video Presentation (MUST show transaction flow end-to-end)
- Slide Presentation

### Code & Demo:
- Public GitHub Repository
- Demo Application Platform
- Application URL

### Circle Product Feedback (Required):
- Which Circle products used (Arc, USDC, Wallets, Gateway, Bridge Kit, Nanopayments)
- Why you chose these products
- What worked well
- What could be improved
- Recommendations for better developer experience

### Technical Proof:
- Per-action pricing ≤ $0.01
- 50+ onchain transactions in demo
- Margin explanation vs traditional gas costs
- Transaction via Circle Developer Console verified on Arc Block Explorer

---

## Schedule

| Date & Time (UTC) | Event |
|--------------------|-------|
| Apr 20, 5:00 PM | Hackathon Kick-off |
| Apr 20, 5:05 PM | lablab.ai opening words (Pawel Czech) |
| Apr 20, 5:10 PM | Circle Opening words (Corey Cooper) |
| Apr 20, 5:15 PM | Introduction to the Challenge |
| Apr 20, 5:25 PM | Hackathon Guide |
| Apr 20, 6:00 PM | Discord Q&A session |
| Apr 25, 5:00 PM | Doors open (On-site SF) |
| Apr 25, 5:30 PM | Welcoming remarks (On-site SF) |
| Apr 25, 6:10 PM | Workshop — Project submission |
| **Apr 26, 12:00 AM** | **End of Submissions!** |
| Apr 26, 12:00 AM | Networking |
| Apr 26, 3:00 AM | Doors close |
| Apr 26, 5:00 PM | Doors open |
| Apr 26, 5:30 PM | Live on-stage pitching |
| Apr 26, 10:00 PM | On-site Winners Ceremony |
| Apr 27, 12:00 AM | Doors close |

---

## Speakers, Mentors & Judges

- **Corey Cooper** — Senior Manager, Developer Relations and Ecosystem Marketing (Circle)
- **Evelina Kaluzhner** — Sr. Principal Product Manager
- **Hui Jing Chen** — Senior Manager, Developer Relations, APAC
- **Pawel Czech** — CEO (lablab.ai / NativelyAI)
- **Neha Komma** — VP of Product, Payments
- **Anthony Kelani** — Director of Ecosystem Growth & Strategy
- **Andrea Marazzi** — Founder & CCO
- **Blessing Adesiji** — Developer Relations Manager, EMEA
- **Karen Sheng** — Chief Product Officer
- **Luca Franceschini** — Developer Relations
- **Elton Tay** — Developer Relations Lead, APAC

---

## Our Project: Mtrly — Pay What You Consume

> Pronounced **"meterly"** — content metered by the second.

**Track:** Real-Time Micro-Commerce Flow + Per-API Monetization Engine

**Concept:** Content platform where viewers pay per minute of video / per paragraph of text. No subscriptions. Powered by Circle Nanopayments on Arc.

**Details:** See [PRD.md](PRD.md)

---

## Key Context (for strategy)

### What Arc + Nanopayments actually does:
- Arc = stablecoin-native L1 от Circle, EVM-compatible
- USDC = native gas token (не ETH!)
- Nanopayments = офчейн агрегация → батч-сеттлмент ончейн. Газ = $0 для пользователя и разработчика (Circle покрывает)
- x402 = HTTP 402 Payment Required → AI-агент платит за API-вызов нативно через HTTP
- Прямая Arc транзакция ~$0.01, но через Nanopayments = бесплатно

### Why this matters (margin argument):
- Traditional L1: gas $0.01–$0.50 per tx → sub-cent pricing impossible
- Arc + Nanopayments: gas-free user-level txs → per-action pricing ≤ $0.001 viable
- This is the "margin explanation" judges want to see

### What judges REALLY want:
1. **Working demo** with real onchain txs (not mocks)
2. **Economic proof** — show the math on why this only works on Arc
3. **Clear use case** — real business problem, not a toy
4. **Good pitch** — video + slides that tell a story
5. **Feedback quality** — thoughtful Circle product feedback = extra $500 USDC

### Winning formula:
- Pick a track where sub-cent pricing creates a NEW market (not just cheaper existing)
- Show high tx frequency (aim for 100+ not just 50)
- Make the margin explanation visual and compelling
- Use x402 if possible — it's the flagship tech they're promoting
- Write detailed, constructive Circle product feedback
