import { v4 as uuidv4 } from "uuid";
import { circleClient, ARC_BLOCKCHAIN } from "./circle";
import { db } from "./db";

let cachedWalletSetId: string | null = null;

async function getOrCreateWalletSet(): Promise<string> {
  if (cachedWalletSetId) return cachedWalletSetId;

  const existing = process.env.CIRCLE_WALLET_SET_ID;
  if (existing) {
    cachedWalletSetId = existing;
    return existing;
  }

  const client = circleClient();
  const res = await client.createWalletSet({
    name: `Mtrly-${process.env.NODE_ENV ?? "dev"}`,
    idempotencyKey: uuidv4(),
  });

  const walletSetId = res.data?.walletSet?.id;
  if (!walletSetId) throw new Error("createWalletSet returned no id");

  cachedWalletSetId = walletSetId;
  console.log(`[circle] created walletSet ${walletSetId} — save to CIRCLE_WALLET_SET_ID`);
  return walletSetId;
}

export async function provisionUserWallet(userId: number): Promise<{
  walletId: string;
  address: string;
}> {
  const client = circleClient();
  const walletSetId = await getOrCreateWalletSet();

  const res = await client.createWallets({
    accountType: "EOA",
    blockchains: [ARC_BLOCKCHAIN] as any,
    count: 1,
    walletSetId,
    idempotencyKey: uuidv4(),
  });

  const wallet = res.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) {
    throw new Error("createWallets returned no wallet");
  }

  await db.user.update({
    where: { id: userId },
    data: {
      circleWalletId: wallet.id,
      circleWalletAddr: wallet.address,
    },
  });

  return { walletId: wallet.id, address: wallet.address };
}
