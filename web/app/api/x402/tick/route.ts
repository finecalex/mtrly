import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentRequirements,
  decodePaymentSignature,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  getFacilitator,
} from "@/lib/x402";

export const dynamic = "force-dynamic";

const PAY_TO = process.env.PLATFORM_WALLET_ADDRESS;

async function handle(req: NextRequest) {
  if (!PAY_TO) {
    return NextResponse.json({ error: "PLATFORM_WALLET_ADDRESS not configured" }, { status: 503 });
  }

  const priceDollars = new URL(req.url).searchParams.get("price") ?? "$0.01";
  const requirements = await buildPaymentRequirements({ priceDollars, payTo: PAY_TO });

  const sig = req.headers.get("payment-signature");
  if (!sig) {
    const paymentRequired = {
      x402Version: 2,
      resource: {
        url: req.url,
        description: "Mtrly pay-per-tick",
        mimeType: "application/json",
      },
      accepts: [requirements],
    };
    return new NextResponse(JSON.stringify({}), {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-REQUIRED": encodePaymentRequiredHeader(paymentRequired),
      },
    });
  }

  const paymentPayload = decodePaymentSignature(sig);
  const facilitator = getFacilitator();

  const verifyRes = await facilitator.verify(paymentPayload as never, requirements as never);
  if (!verifyRes.isValid) {
    return NextResponse.json(
      { error: "verify_failed", reason: verifyRes.invalidReason },
      { status: 402 },
    );
  }

  const settleRes = await facilitator.settle(paymentPayload as never, requirements as never);
  if (!settleRes.success) {
    return NextResponse.json(
      { error: "settle_failed", reason: settleRes.errorReason },
      { status: 402 },
    );
  }

  const responseHeader = encodePaymentResponseHeader({
    success: true,
    transaction: settleRes.transaction,
    network: requirements.network,
    payer: settleRes.payer ?? verifyRes.payer ?? "",
  });

  return new NextResponse(
    JSON.stringify({
      ok: true,
      transaction: settleRes.transaction,
      amount: requirements.amount,
      payer: settleRes.payer ?? verifyRes.payer ?? "",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-RESPONSE": responseHeader,
      },
    },
  );
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
