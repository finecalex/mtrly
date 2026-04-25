export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      return /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
    }
    if (
      u.hostname === "youtube.com" ||
      u.hostname === "www.youtube.com" ||
      u.hostname === "m.youtube.com"
    ) {
      const v = u.searchParams.get("v");
      return v && /^[a-zA-Z0-9_-]{6,15}$/.test(v) ? v : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function youtubeThumbnail(videoId: string, quality: "max" | "hq" | "default" = "hq"): string {
  const file =
    quality === "max" ? "maxresdefault.jpg"
    : quality === "hq" ? "hqdefault.jpg"
    : "default.jpg";
  return `https://i.ytimg.com/vi/${videoId}/${file}`;
}

export function previewImageForUrl(rawUrl: string): string | null {
  const id = extractYouTubeVideoId(rawUrl);
  if (id) return youtubeThumbnail(id, "hq");
  return null;
}
