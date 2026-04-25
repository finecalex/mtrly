export const PRICING = {
  video: {
    pricePerMinute: 0.05,
    tickIntervalSec: 5,
    tickAmount: 0.05 / 12,
  },
  text: {
    pricePerParagraph: 0.005,
    dwellMs: 200,
    freeParagraphs: 1,
  },
  split: {
    creator: 0.8,
    platform: 0.2,
  },
  unlockThreshold: 0.8,
} as const;

export const ARC = {
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  usdcErc20: "0x3600000000000000000000000000000000000000",
} as const;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
