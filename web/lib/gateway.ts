import { GatewayClient } from "@circle-fin/x402-batching/client";

const KEY = process.env.MTRLY_DEMO_BUYER_KEY as `0x${string}` | undefined;

let client: GatewayClient | null = null;

export function getGatewayClient(): GatewayClient {
  if (!KEY) throw new Error("MTRLY_DEMO_BUYER_KEY not set");
  if (!client) {
    client = new GatewayClient({ chain: "arcTestnet", privateKey: KEY });
  }
  return client;
}

export function gatewayConfigured(): boolean {
  return typeof KEY === "string" && KEY.startsWith("0x") && KEY.length === 66;
}

export async function gatewayStatus() {
  const c = getGatewayClient();
  const balances = await c.getBalances();
  return {
    address: c.address,
    chain: c.chainName,
    gateway: {
      available: balances.gateway.available.toString(),
      availableFormatted: balances.gateway.formattedAvailable,
      total: balances.gateway.total.toString(),
      totalFormatted: balances.gateway.formattedTotal,
    },
    wallet: {
      balance: balances.wallet.balance.toString(),
      balanceFormatted: balances.wallet.formatted,
    },
  };
}

export async function gatewayDeposit(amountUsdc: string) {
  const c = getGatewayClient();
  const res = await c.deposit(amountUsdc);
  return {
    depositTxHash: res.depositTxHash,
    approvalTxHash: res.approvalTxHash,
    amount: res.formattedAmount,
    depositor: res.depositor,
  };
}

export async function gatewayWithdraw(amountUsdc: string) {
  const c = getGatewayClient();
  const res = await c.withdraw(amountUsdc);
  return {
    mintTxHash: res.mintTxHash,
    amount: res.formattedAmount,
    recipient: res.recipient,
    sourceChain: res.sourceChain,
    destinationChain: res.destinationChain,
  };
}

export function arcExplorerTx(hash: string): string {
  return `https://testnet.arcscan.app/tx/${hash}`;
}

const SELF_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function settleTickViaGateway(params: {
  amountUsdc: number;
}): Promise<{ transaction: string; amount: string; formattedAmount: string }> {
  const c = getGatewayClient();
  const priceDollars = params.amountUsdc.toFixed(6);
  const url = `${SELF_URL}/api/x402/tick?price=${encodeURIComponent(priceDollars)}`;
  const res = await c.pay(url, { method: "GET" });
  return {
    transaction: res.transaction,
    amount: res.amount.toString(),
    formattedAmount: res.formattedAmount,
  };
}
