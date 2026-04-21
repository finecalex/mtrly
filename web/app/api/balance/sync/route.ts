import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createPublicClient, http, erc20Abi, formatUnits, getAddress } from "viem";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ARC } from "@/lib/config";

export const dynamic = "force-dynamic";

const SYNC_REF_PREFIX = "onchain-sync:";

const arcChain = {
  id: ARC.chainId,
  name: "Arc Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ARC.rpcUrl] } },
} as const;

function pc() {
  return createPublicClient({ chain: arcChain, transport: http(ARC.rpcUrl) });
}

export async function POST() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const wallet = user.circleWalletAddr ?? user.walletAddress;
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "no_wallet" }, { status: 400 });
  }

  const raw = await pc().readContract({
    address: getAddress(ARC.usdcErc20),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [getAddress(wallet)],
  });

  const onchainUsdc = new Prisma.Decimal(formatUnits(raw, 6));

  const priorAgg = await db.balanceTransaction.aggregate({
    where: {
      userId: uid,
      type: "deposit",
      referenceId: { startsWith: SYNC_REF_PREFIX },
    },
    _sum: { amountUsdc: true },
  });
  const priorSynced = new Prisma.Decimal(priorAgg._sum.amountUsdc?.toString() ?? "0");
  const delta = onchainUsdc.minus(priorSynced);

  if (delta.lte(0)) {
    const balance = await db.balance.findUnique({ where: { userId: uid } });
    return NextResponse.json({
      ok: true,
      credited: "0",
      onchainUsdc: onchainUsdc.toString(),
      priorSynced: priorSynced.toString(),
      balance: balance?.amountUsdc.toString() ?? "0",
      wallet,
    });
  }

  const ref = `${SYNC_REF_PREFIX}${Date.now()}`;
  await db.$transaction([
    db.balance.upsert({
      where: { userId: uid },
      update: { amountUsdc: { increment: delta } },
      create: { userId: uid, amountUsdc: delta },
    }),
    db.balanceTransaction.create({
      data: {
        userId: uid,
        type: "deposit",
        amountUsdc: delta,
        referenceId: ref,
      },
    }),
  ]);

  const balance = await db.balance.findUnique({ where: { userId: uid } });
  return NextResponse.json({
    ok: true,
    credited: delta.toString(),
    onchainUsdc: onchainUsdc.toString(),
    priorSynced: priorSynced.plus(delta).toString(),
    balance: balance?.amountUsdc.toString() ?? "0",
    wallet,
  });
}
