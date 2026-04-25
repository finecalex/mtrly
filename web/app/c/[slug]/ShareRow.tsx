"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export default function ShareRow({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false);

  function fullUrl() {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/c/${slug}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  }

  const text = encodeURIComponent(`Pay ${name} per-second on Arc Testnet via @MtrlyHQ —`);
  const url = typeof window !== "undefined" ? encodeURIComponent(fullUrl()) : "";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase hover:border-fg"
      >
        {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${url}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase hover:border-fg"
      >
        <Share2 size={12} /> Share on X
      </a>
      <a
        href={`https://t.me/share/url?url=${url}&text=${text}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase hover:border-fg"
      >
        Telegram
      </a>
    </div>
  );
}
