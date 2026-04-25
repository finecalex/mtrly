export function splitParagraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function paragraphCount(body: string): number {
  return splitParagraphs(body).length;
}

const ESC_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

export function renderInline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (_, t, u) =>
      `<a href="${u}" target="_blank" rel="noreferrer noopener" class="underline text-accent hover:text-accent/80">${t}</a>`,
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*[^*\s]|[^*\s])\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}

export function firstParagraphPreview(body: string, maxLen = 240): string {
  const paras = splitParagraphs(body);
  if (paras.length === 0) return "";
  const p = paras[0];
  if (p.length <= maxLen) return p;
  return p.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}
