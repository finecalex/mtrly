"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

const PALETTE = [
  ["#6e56cf", "#3a2873"],
  ["#0ea5e9", "#0c4a6e"],
  ["#10b981", "#053e2e"],
  ["#f59e0b", "#7a4400"],
  ["#ef4444", "#7a1717"],
  ["#ec4899", "#7a1646"],
  ["#8b5cf6", "#3b1f7a"],
  ["#14b8a6", "#0a4f48"],
];

function hashToIdx(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE.length;
}

function initials(name?: string | null, email?: string | null): string {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+|@/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase().slice(0, 2);
}

function dicebearUrl(seed: string): string {
  // Deterministic geometric avatar — no auth needed, served as inline SVG.
  const s = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${s}&backgroundType=gradientLinear&backgroundRotation=0,360`;
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  seed?: string | null;
  size?: number;
}

export function Avatar({ src, name, email, seed, size = 40, className, ...props }: AvatarProps) {
  const key = (seed ?? name ?? email ?? "?").toLowerCase();
  const [c1, c2] = PALETTE[hashToIdx(key)];
  const ini = initials(name, email);
  const generated = !src ? dicebearUrl(key) : null;
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImg = (src || generated) && !imgFailed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "border border-border/70",
        className,
      )}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      {...props}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={(src ?? generated) as string}
          alt={name ?? email ?? "avatar"}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="font-semibold text-white/95"
          style={{ fontSize: Math.max(11, Math.floor(size * 0.4)) }}
        >
          {ini}
        </span>
      )}
    </div>
  );
}
