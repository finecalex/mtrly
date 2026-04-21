import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

let cached: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

export function circleClient() {
  if (cached) return cached;

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey) throw new Error("CIRCLE_API_KEY not set");
  if (!entitySecret) throw new Error("CIRCLE_ENTITY_SECRET not set");

  cached = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  return cached;
}

// SDK v8 TS types lag behind Circle's API — Arc testnet string is accepted at
// runtime but not in the Blockchain union. Cast via any where passed to SDK.
export const ARC_BLOCKCHAIN = "ARC-TESTNET" as const;
export type ArcBlockchain = typeof ARC_BLOCKCHAIN;
