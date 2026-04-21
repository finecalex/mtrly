const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "ref", "ref_src", "si",
]);

export function normalizeUrl(raw: string): { normalized: string; kind: "youtube" | "web" } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  u.hash = "";
  for (const key of Array.from(u.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key)) u.searchParams.delete(key);
  }

  if (u.hostname === "youtu.be") {
    const id = u.pathname.slice(1);
    return { normalized: `https://www.youtube.com/watch?v=${id}`, kind: "youtube" };
  }

  if (u.hostname === "youtube.com" || u.hostname === "www.youtube.com" || u.hostname === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (!v) throw new Error("YouTube URL missing ?v=");
    return { normalized: `https://www.youtube.com/watch?v=${v}`, kind: "youtube" };
  }

  u.hostname = u.hostname.replace(/^www\./, "");
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  return { normalized: u.toString(), kind: "web" };
}
