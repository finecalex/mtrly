# Technical Reference: Arc + Circle Nanopayments + Wallets

> Собрано для подготовки к хакатону Agentic Economy on Arc (Apr 20–26, 2026)

---

## 1. Arc Blockchain

### Архитектура
- **Consensus:** Malachite (Tendermint BFT), Proof-of-Authority
- **Execution:** Reth (Rust Ethereum client), EVM-compatible (Prague hard fork)
- **Finality:** Детерминистическая, sub-second (<1 сек). Нет реорганизаций — tx либо не подтверждена, либо финальная
- **Gas token:** USDC (ETH не нужен вообще)

### Testnet

| Parameter | Value |
|-----------|-------|
| Chain ID | `5042002` (hex: `0x4cef52`) |
| RPC (HTTP) | `https://rpc.testnet.arc.network` |
| RPC (WSS) | `wss://rpc.testnet.arc.network` |
| Block Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| Native Currency | USDC (18 decimals для gas) |
| USDC ERC-20 | `0x3600000000000000000000000000000000000000` (6 decimals) |

Альтернативные RPC: Alchemy, Blockdaemon, dRPC (`https://arc-testnet.drpc.org`), QuickNode.

### Gotchas

| Gotcha | Описание |
|--------|---------|
| USDC decimals | Native gas = **18 decimals**, ERC-20 USDC = **6 decimals**. Не путать! |
| `SELFDESTRUCT` | Заблокирован при деплое (сжигал бы USDC) |
| `block.prevrandao` | Всегда 0 — нельзя использовать для рандома |
| EIP-4844 blobs | Не поддерживается |
| Block timestamps | Не строго возрастающие (sub-second блоки могут иметь одинаковый timestamp) |
| Gas floor | Всегда ставить `maxFeePerGas >= 160 Gwei` |
| USDC blocklist | Проверяется на уровне протокола (pre-mempool + post-execution) |
| Mainnet | Ещё не запущен. Всё на testnet |

### Деплой контрактов
Стандартный Foundry/Hardhat. Пример:
```shell
forge create src/Contract.sol:Contract \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## 2. Circle Nanopayments (x402)

### Как работает

```
1. Buyer deposits USDC → Gateway Wallet contract (1 ончейн tx, газ 1 раз)
2. Buyer запрашивает ресурс: GET /premium-content
3. Seller отвечает HTTP 402 + заголовок PAYMENT-REQUIRED (цена, адрес, схема)
4. Buyer подписывает EIP-3009 TransferWithAuthorization (офчейн, 0 газа)
5. Buyer повторяет запрос с подписью в заголовке X-PAYMENT
6. Seller middleware вызывает Circle Gateway settle:
   POST https://gateway-api-testnet.circle.com/gateway/v1/x402/settle
7. Gateway подтверждает → seller отдаёт контент
8. Gateway агрегирует N авторизаций → 1 ончейн batch (Circle платит газ)
```

### SDK и пакеты

**Buyer (клиент):**
```bash
npm install @circle-fin/x402-batching viem
```

```typescript
import { GatewayClient } from "@circle-fin/x402-batching/client";

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

// 1. Депозит в Gateway Wallet (один раз, ончейн)
await client.deposit("1");  // $1 USDC

// 2. Оплата ресурса (офчейн, мгновенно)
const { data, status } = await client.pay(url);
```

**Seller (сервер):**
```typescript
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";

const gateway = createGatewayMiddleware({
  sellerAddress: "0xYOUR_ADDRESS"
});

app.get("/premium", gateway.require("$0.01"), (req, res) => {
  res.json({ data: "...", paid_by: req.payment.payer });
});
```

**Альтернатива — x402-express (Coinbase):**
```bash
npm install x402-express
```

**Альтернатива — x402-next (Next.js):**
```bash
npm install x402-next
```

### EIP-3009 (что подписывает buyer)

```javascript
const typedData = {
  domain: { name: 'USDC', version: '2', chainId: CHAIN_ID, verifyingContract: USDC },
  types: {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  },
  message: { from, to, value, validAfter, validBefore, nonce },
};
```

`@circle-fin/x402-batching` делает это автоматически при вызове `client.pay()`.

### Rate Limits

| Параметр | Значение |
|----------|---------|
| Wallets API (POST) | 5 req/sec |
| Wallets API (GET) | 20 req/sec |
| Nanopayments-специфичный | Не опубликован (testnet) |
| Латентность платежа | ~100-500ms (офчейн) |
| Batch settlement timing | Недетерминистический (Circle решает когда) |

**Для Drip:** 1 tx / 5 сек = 12 tx/мин — безопасно, далеко от лимитов.

### Facilitators

| Facilitator | URL | Лимит |
|-------------|-----|-------|
| Circle Gateway | `https://gateway-api-testnet.circle.com/gateway/v1/x402/settle` | Не опубликован |
| Coinbase x402.org | `https://x402.org/facilitator` | 1000 бесплатных tx/мес |

### Вывод средств

```typescript
await client.withdraw("5");                            // на Arc
await client.withdraw("5", { chain: "baseSepolia" }); // кросс-чейн
```

---

## 3. Circle Wallets

### Два типа

| | Developer-Controlled | User-Controlled |
|---|---|---|
| Кто хранит ключи | Backend (мы) | Пользователь (MPC 2-of-2) |
| Кто подписывает tx | Backend | Пользователь (PIN/social/passkey) |
| Нужно ли одобрение юзера | Нет | Да, каждую транзакцию |
| Подходит для | Автоматизация, payouts | Non-custodial, юзер владеет деньгами |

**Для Drip — нужны оба:**
- **User-controlled** — кошелёк зрителя (он владеет деньгами, одобряет расходы)
- **Developer-controlled** — кошелёк платформы (получает 20% комиссию)
- **Creator** — может быть user-controlled или external wallet (любой EVM-адрес)

### Developer-Controlled (backend)

```bash
npm install @circle-fin/developer-controlled-wallets
```

```typescript
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,  // 32 bytes, generate once, NEVER lose
});

// Создать wallet set
const { data: { walletSet } } = await client.createWalletSet({ name: "Drip" });

// Создать кошелёк на Arc Testnet
const { data: { wallets } } = await client.createWallets({
  accountType: "EOA",
  blockchains: ["ARC-TESTNET"],
  count: 1,
  walletSetId: walletSet.id,
});
```

### User-Controlled (frontend)

```bash
npm install @circle-fin/w3s-pw-web-sdk
```

Flow:
1. Backend создаёт user identity → возвращает `userToken` + `encryptionKey`
2. Frontend инициализирует SDK с `appId`, `userToken`, `encryptionKey`
3. SDK показывает модалку: social login / email OTP / PIN
4. Юзер создаёт кошелёк (challenge: `INITIALIZE` → `SET_PIN` → `CREATE_WALLET`)
5. Далее каждая транзакция = `sdk.execute(challengeId, callback)`

**Важно:** нет MetaMask-style "connect" кнопки. Всё через Circle Web SDK модалку.

### Auth

- Юзеру **не нужен Circle аккаунт**
- Аутентификация через наше приложение (social login / email / PIN)
- Circle управляет identity infrastructure за кулисами

### Entity Secret (CRITICAL)

```bash
# Генерация (один раз, сохранить навечно)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- Circle его НЕ хранит
- Если потерян → кошельки навсегда недоступны
- Нужно зарегистрировать через `registerEntitySecretCiphertext()`

---

## 4. Developer Account Setup

1. Зарегистрироваться на `console.circle.com` (instant, без approval)
2. Создать API key в Developer Console
3. Сгенерировать Entity Secret (32 bytes)
4. Зарегистрировать Entity Secret через SDK
5. Получить test USDC: `faucet.circle.com` — 10-20 USDC/запрос, без аккаунта

### Faucet

| Источник | Лимит |
|----------|-------|
| Public faucet (faucet.circle.com) | 10 USDC / 24ч / адрес |
| Developer Console faucet | 20 USDC / запрос, 10 раз/день |
| Discord | Дополнительные суммы по запросу |

**Для демо Drip нужно:** минимум $2.50 (50 tx × $0.05). Запасти $10-20 на тесты.

---

## 5. SDK Reference

| SDK | Пакет | Назначение |
|-----|-------|-----------|
| Nanopayments (buyer+seller) | `@circle-fin/x402-batching` | Основной для Drip |
| x402 Express middleware | `x402-express` | Альтернатива для Express |
| x402 Next.js middleware | `x402-next` | Альтернатива для Next.js |
| Developer Wallets | `@circle-fin/developer-controlled-wallets` | Backend wallets |
| User Wallets (Web) | `@circle-fin/w3s-pw-web-sdk` | Frontend wallet UI |
| Smart Contracts | `@circle-fin/smart-contract-platform` | Contract deployment |
| App Kit | `@circle-fin/app-kit` | Bridge, swap, send |

---

## 6. GitHub Reference Repos

| Repo | Что внутри |
|------|-----------|
| `circlefin/arc-commerce` | Next.js + Supabase + dev-controlled wallets, Arc Testnet |
| `circlefin/arc-multichain-wallet` | Cross-chain Gateway, EIP-712, Wagmi/Viem |
| `circlefin/payments-sample-app` | General Circle Payments API |
| `coinbase/x402` | x402 protocol reference |

---

## 7. Known Limitations & Risks

| Ограничение | Влияние на Drip |
|-------------|----------------|
| Nanopayments — только testnet | Демо на тестовых деньгах. Ок для хакатона |
| `@circle-fin/x402-batching` — новый, мало документации | Закладывать время на debugging |
| Entity Secret — невосстановим | Бэкапить сразу |
| Faucet — 10-20 USDC/день | Заранее накопить на тесты |
| Batch settlement — время непредсказуемо | Arc Explorer может показывать tx с задержкой |
| User-controlled wallet — modal UI от Circle | Не кастомизируется, UX может быть clunky |
| x402 facilitator Circle vs Coinbase — разные | Использовать Circle's для нашего кейса |
