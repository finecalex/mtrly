import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";

export const X402_NETWORK = "eip155:5042002";
const CIRCLE_BATCHING_NAME = "GatewayWalletBatched";
const CIRCLE_BATCHING_VERSION = "1";
const CIRCLE_BATCHING_SCHEME = "exact";

let _facilitator: BatchFacilitatorClient | null = null;
export function getFacilitator(): BatchFacilitatorClient {
  if (!_facilitator) _facilitator = new BatchFacilitatorClient();
  return _facilitator;
}

let _cachedKind: { asset: string; verifyingContract: string } | null = null;
async function getArcKind() {
  if (_cachedKind) return _cachedKind;
  const supported = await getFacilitator().getSupported();
  const kind = supported.kinds.find(
    (k) => k.scheme === CIRCLE_BATCHING_SCHEME && k.network === X402_NETWORK && (k.extra as Record<string, unknown> | undefined)?.verifyingContract,
  );
  if (!kind) throw new Error(`No Gateway support for ${X402_NETWORK}`);
  const extra = kind.extra as Record<string, unknown>;
  const assets = (extra.assets as Array<{ symbol: string; address: string }>) ?? [];
  const usdc = assets.find((a) => a.symbol === "USDC");
  if (!usdc) throw new Error(`No USDC asset on ${X402_NETWORK}`);
  _cachedKind = { asset: usdc.address, verifyingContract: String(extra.verifyingContract) };
  return _cachedKind;
}

export function parseUsdcPrice(priceDollars: string): string {
  const n = parseFloat(priceDollars.replace("$", ""));
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid price: ${priceDollars}`);
  return Math.round(n * 1_000_000).toString();
}

export async function buildPaymentRequirements(params: {
  priceDollars: string;
  payTo: string;
}) {
  const kind = await getArcKind();
  return {
    scheme: CIRCLE_BATCHING_SCHEME,
    network: X402_NETWORK,
    asset: kind.asset,
    amount: parseUsdcPrice(params.priceDollars),
    payTo: params.payTo,
    maxTimeoutSeconds: 345600,
    extra: {
      name: CIRCLE_BATCHING_NAME,
      version: CIRCLE_BATCHING_VERSION,
      verifyingContract: kind.verifyingContract,
    },
  };
}

export function encodePaymentRequiredHeader(x: unknown): string {
  return Buffer.from(JSON.stringify(x)).toString("base64");
}
export function encodePaymentResponseHeader(x: unknown): string {
  return Buffer.from(JSON.stringify(x)).toString("base64");
}
export function decodePaymentSignature(header: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
}
