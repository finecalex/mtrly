import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureLocalEoa, getUserGatewayClient, userWalletConfigured } from "@/lib/userWallet";

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: uid },
    select: { id: true, ownedEoaAddress: true },
  });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const configured = userWalletConfigured();
  let address: string | null = user.ownedEoaAddress;
  if (!address && configured) {
    try {
      address = await ensureLocalEoa(uid);
    } catch (e) {
      console.error(`[wallet/mine] ensureLocalEoa failed for user ${uid}:`, e);
    }
  }

  if (!address) {
    return NextResponse.json({
      ok: true,
      configured,
      address: null,
      explorerUrl: null,
      gateway: null,
    });
  }
  const explorerUrl = `https://testnet.arcscan.app/address/${address}`;

  let gateway: {
    availableFormatted: string;
    totalFormatted: string;
    walletBalanceFormatted: string;
  } | null = null;

  try {
    const client = await getUserGatewayClient(uid);
    if (client) {
      const balances = await client.getBalances();
      gateway = {
        availableFormatted: balances.gateway.formattedAvailable,
        totalFormatted: balances.gateway.formattedTotal,
        walletBalanceFormatted: balances.wallet.formatted,
      };
    }
  } catch (e) {
    console.error(`[wallet/mine] balance lookup failed for user ${uid}:`, e);
  }

  return NextResponse.json({
    ok: true,
    configured,
    address,
    explorerUrl,
    gateway,
  });
}
