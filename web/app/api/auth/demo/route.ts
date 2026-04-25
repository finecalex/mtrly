import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, issueToken, setSessionCookie } from "@/lib/auth";
import { provisionUserWallet } from "@/lib/wallet";
import { provisionLocalEoa, userWalletConfigured } from "@/lib/userWallet";
import { slugFromEmail, uniqueSlugFor } from "@/lib/profile";
import { gatewayConfigured, getGatewayClient } from "@/lib/gateway";

// Demo accounts get $1 of REAL testnet USDC, not fake offchain padding.
// We seed both layers in lock-step so spending stays accurate:
//   - $1 onchain Gateway pool (so ticks actually publish to Arc as user's EOA)
//   - $1 internal balance (so the per-tick Postgres precheck passes)
// Both drain 1:1 as the user spends seconds. Visible on arcscan as their own
// address from the moment the demo button completes.
const DEMO_AMOUNT = "1.00";

function rand(n = 6): string {
  return Math.random().toString(36).slice(2, 2 + n);
}

export async function POST(_req: NextRequest) {
  const ts = Date.now().toString(36);
  const suffix = rand(5);
  const email = `demo-${ts}-${suffix}@mtrly.demo`;
  const displayName = `Demo viewer ${suffix.toUpperCase()}`;
  const passwordHash = await hashPassword(`demo-${ts}-${suffix}-pw`);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      role: "viewer",
      balance: { create: { amountUsdc: new Prisma.Decimal(DEMO_AMOUNT) } },
    },
  });

  await db.balanceTransaction.create({
    data: {
      userId: user.id,
      type: "deposit",
      amountUsdc: new Prisma.Decimal(DEMO_AMOUNT),
      referenceId: "demo-account-grant",
    },
  });

  try {
    const baseSlug = slugFromEmail(email);
    const slug = await uniqueSlugFor(user.id, baseSlug);
    await db.user.update({ where: { id: user.id }, data: { slug } });
  } catch (e) {
    console.error("[demo] slug failed:", e);
  }

  let walletAddress: string | null = null;
  try {
    const wallet = await provisionUserWallet(user.id);
    walletAddress = wallet.address;
  } catch (e) {
    console.error("[demo] Circle wallet provisioning failed:", e);
  }

  let ownedEoaAddress: string | null = null;
  if (userWalletConfigured()) {
    try {
      const eoa = await provisionLocalEoa(user.id);
      ownedEoaAddress = eoa.address;
    } catch (e) {
      console.error("[demo] local EOA provisioning failed:", e);
    }
  }

  // Fund the new demo user's onchain Gateway pool from the platform's pool so
  // their per-tick settlements actually publish to Arc Testnet (visible on
  // arcscan as user's EOA, not the platform's). 2 fresh onchain tx per demo
  // signup (approve + deposit) which judges can verify immediately.
  let onchain: null | {
    poolUsdc: string;
    depositTxHash: string | null;
    approvalTxHash: string | null;
    explorerUrl: string | null;
  } = null;
  if (gatewayConfigured() && ownedEoaAddress) {
    try {
      const platform = getGatewayClient();
      const res = await platform.depositFor(DEMO_AMOUNT, ownedEoaAddress as `0x${string}`);
      onchain = {
        poolUsdc: DEMO_AMOUNT,
        depositTxHash: res.depositTxHash ?? null,
        approvalTxHash: res.approvalTxHash ?? null,
        explorerUrl: res.depositTxHash ? `https://testnet.arcscan.app/tx/${res.depositTxHash}` : null,
      };
    } catch (e) {
      console.error("[demo] Gateway pool seed failed:", e);
    }
  }

  const token = await issueToken(user.id);
  setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    walletAddress,
    ownedEoaAddress,
    balance: DEMO_AMOUNT,
    onchain,
    next: "/explore",
  });
}
