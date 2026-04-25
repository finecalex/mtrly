import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { splitParagraphs, readTimeMinutes } from "@/lib/articleBody";

export const runtime = "nodejs";
export const alt = "Mtrly article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PALETTE: Array<[string, string, string]> = [
  ["#6e56cf", "#3a2873", "#1a0f3d"],
  ["#0ea5e9", "#0c4a6e", "#082338"],
  ["#10b981", "#053e2e", "#021c14"],
  ["#f59e0b", "#7a4400", "#3d2200"],
  ["#ef4444", "#7a1717", "#3d0a0a"],
  ["#ec4899", "#7a1646", "#3d0a23"],
  ["#8b5cf6", "#3b1f7a", "#1a0e3d"],
  ["#14b8a6", "#0a4f48", "#062826"],
  ["#f97316", "#7c2d12", "#451a08"],
  ["#84cc16", "#3f6212", "#1a2806"],
];

function hashIdx(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE.length;
}

export default async function Image({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0a", color: "#fff" }}>
          Mtrly · article not found
        </div>
      ),
      { ...size },
    );
  }
  const article = await db.contentUrl.findUnique({
    where: { id },
    include: { creator: { select: { displayName: true, slug: true } } },
  });
  if (!article || article.kind !== "mtrly") {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0a", color: "#fff" }}>
          Mtrly · article not found
        </div>
      ),
      { ...size },
    );
  }
  const paragraphs = splitParagraphs(article.bodyMarkdown ?? "");
  const readMin = readTimeMinutes(article.bodyMarkdown ?? "");
  const totalCost = paragraphs.length * 0.005;
  const [a, b, c] = PALETTE[hashIdx(`mtrly-${article.id}-${article.title ?? ""}`)];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${a} 0%, ${b} 60%, ${c} 100%)`,
          display: "flex",
          flexDirection: "column",
          padding: 64,
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", width: 16, height: 16, borderRadius: 16, background: "#7cff7c" }} />
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.7)", letterSpacing: 2, textTransform: "uppercase" }}>
            mtrly · article
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: article.title && article.title.length > 60 ? 56 : 72,
            fontWeight: 700,
            marginTop: 24,
            lineHeight: 1.1,
            maxWidth: 1080,
          }}
        >
          {article.title ?? "Untitled"}
        </div>

        {article.description && (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              marginTop: 24,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 1080,
            }}
          >
            {article.description.slice(0, 220)}
          </div>
        )}

        <div style={{ display: "flex", marginTop: "auto", gap: 24, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 2 }}>
              by
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, marginTop: 4 }}>
              {article.creator.displayName ?? article.creator.slug ?? "creator"}
            </div>
          </div>
          <div style={{ display: "flex", marginLeft: "auto", gap: 24 }}>
            <Pill text={`~${readMin} min read`} />
            <Pill text={`${paragraphs.length} paragraphs`} />
            <Pill text={`~$${totalCost.toFixed(3)} to read`} accent />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Pill({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        background: accent ? "rgba(124,255,124,0.18)" : "rgba(0,0,0,0.3)",
        border: accent ? "2px solid rgba(124,255,124,0.6)" : "2px solid rgba(255,255,255,0.2)",
        borderRadius: 999,
        padding: "10px 18px",
        fontSize: 22,
        fontWeight: 500,
        color: accent ? "#7cff7c" : "#fff",
      }}
    >
      {text}
    </div>
  );
}
