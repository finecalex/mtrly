import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { db } from "./db";

const ENC_KEY_HEX = process.env.MTRLY_USER_KEY_ENC;

function getEncKey(): Buffer {
  if (!ENC_KEY_HEX) throw new Error("MTRLY_USER_KEY_ENC not set");
  if (ENC_KEY_HEX.length !== 64) {
    throw new Error("MTRLY_USER_KEY_ENC must be 32 bytes hex (64 chars)");
  }
  return Buffer.from(ENC_KEY_HEX, "hex");
}

export function userWalletConfigured(): boolean {
  return typeof ENC_KEY_HEX === "string" && ENC_KEY_HEX.length === 64;
}

function encryptPrivateKey(privateKey: `0x${string}`): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncKey(), iv);
  const ct = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${ct.toString("base64")}:${authTag.toString("base64")}`;
}

function decryptPrivateKey(blob: string): `0x${string}` {
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("invalid encrypted private key blob");
  }
  const [, ivB64, ctB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", getEncKey(), iv);
  decipher.setAuthTag(authTag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8") as `0x${string}`;
}

export async function provisionLocalEoa(userId: number): Promise<{
  address: `0x${string}`;
  privateKey: `0x${string}`;
}> {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const encrypted = encryptPrivateKey(privateKey);

  await db.user.update({
    where: { id: userId },
    data: {
      ownedEoaAddress: account.address,
      ownedEoaPrivateKeyEncrypted: encrypted,
    },
  });

  return { address: account.address, privateKey };
}

export async function getUserPrivateKey(userId: number): Promise<`0x${string}` | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { ownedEoaPrivateKeyEncrypted: true },
  });
  if (!user?.ownedEoaPrivateKeyEncrypted) return null;
  return decryptPrivateKey(user.ownedEoaPrivateKeyEncrypted);
}

const clientCache = new Map<number, GatewayClient>();

export async function ensureLocalEoa(userId: number): Promise<`0x${string}` | null> {
  if (!userWalletConfigured()) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { ownedEoaAddress: true },
  });
  if (user?.ownedEoaAddress) return user.ownedEoaAddress as `0x${string}`;
  const { address } = await provisionLocalEoa(userId);
  return address;
}

export async function getUserGatewayClient(userId: number): Promise<GatewayClient | null> {
  const cached = clientCache.get(userId);
  if (cached) return cached;

  const pk = await getUserPrivateKey(userId);
  if (!pk) return null;

  const client = new GatewayClient({ chain: "arcTestnet", privateKey: pk });
  clientCache.set(userId, client);
  return client;
}
