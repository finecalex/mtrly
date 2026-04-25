import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "Mtrly creator profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PALETTE: Array<[string, string]> = [
  ["#6e56cf", "#3a2873"],
  ["#0ea5e9", "#0c4a6e"],
  ["#10b981", "#053e2e"],
  ["#f59e0b", "#7a4400"],
  ["#ef4444", "#7a1717"],
  ["#ec4899", "#7a1646"],
  ["#8b5cf6", "#3b1f7a"],
  ["#14b8a6", "#0a4f48"],
];

function hashIdx(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE.length;
}

export default async function Image({ params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  const creator = await db.user.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, bio: true, avatarUrl: true },
  });
  if (!creator) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0a", color: "#fff" }}>
          Mtrly · creator not found
        </div>
      ),
      { ...size },
    );
  }
  const earnings = await db.payment.aggregate({
    where: { toUserId: creator.id },
    _sum: { amountUsdc: true },
    _count: { _all: true },
  });
  const onchain = await db.payment.count({ where: { toUserId: creator.id, settledOnchain: true } });
  const initials = (creator.displayName ?? creator.slug ?? "?").trim().slice(0, 2).toUpperCase();
  const [a, b] = PALETTE[hashIdx(creator.slug ?? String(creator.id))];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          fontFamily: "system-ui, sans-serif",
          color: "#f5f5f5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", width: 16, height: 16, borderRadius: 16, background: "#7cff7c" }} />
          <div style={{ display: "flex", fontSize: 22, color: "#8a8a8a", letterSpacing: 2, textTransform: "uppercase" }}>
            mtrly · arc testnet
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 48, gap: 36, alignItems: "center" }}>
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 160,
              background: `linear-gradient(135deg, ${a}, ${b})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 72,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
              {creator.displayName ?? creator.slug}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: "#8a8a8a", marginTop: 8 }}>
              mtrly.app/c/{creator.slug}
            </div>
          </div>
        </div>

        {creator.bio && (
          <div style={{ display: "flex", fontSize: 28, color: "#c5c5c5", marginTop: 36, maxWidth: 1000 }}>
            {creator.bio.slice(0, 220)}
          </div>
        )}

        <div style={{ display: "flex", marginTop: "auto", gap: 32 }}>
          <Stat label="Earned" value={`$${(earnings._sum.amountUsdc?.toNumber?.() ?? 0).toFixed(4)}`} accent />
          <Stat label="Payments" value={String(earnings._count._all)} />
          <Stat label="Onchain settlements" value={String(onchain)} green />
        </div>
      </div>
    ),
    { ...size },
  );
}

function Stat({ label, value, accent, green }: { label: string; value: string; accent?: boolean; green?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: 18, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: 2 }}>
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 48,
          fontWeight: 700,
          marginTop: 6,
          color: accent ? "#7cff7c" : green ? "#4ade80" : "#f5f5f5",
        }}
      >
        {value}
      </div>
    </div>
  );
}
