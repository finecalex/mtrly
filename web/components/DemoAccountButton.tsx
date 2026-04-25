"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";

export function DemoAccountButton({
  primary,
  className,
  label = "Try as demo viewer",
  next,
}: {
  primary?: boolean;
  className?: string;
  label?: string;
  next?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.push({
          kind: "error",
          title: "Demo signup failed",
          description: data.error ?? "unknown",
        });
        setBusy(false);
        return;
      }
      const explorerUrl: string | null = data.onchain?.explorerUrl ?? null;
      const desc = data.onchain
        ? `Real $${data.onchain.poolUsdc} USDC seeded onchain to your Gateway pool. Every second spent settles on Arc Testnet from your EOA.`
        : `$${parseFloat(data.balance).toFixed(2)} preloaded. Spend seconds across creators.`;
      toast.push({
        kind: "success",
        title: `You're in as ${data.user.displayName}`,
        description: desc,
        href: explorerUrl ?? undefined,
        hrefLabel: explorerUrl ? "verify on arcscan" : undefined,
      });
      router.push(next ?? data.next ?? "/explore");
      router.refresh();
    } catch (err) {
      toast.push({
        kind: "error",
        title: "Demo signup failed",
        description: err instanceof Error ? err.message : "network",
      });
      setBusy(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={busy}
      className={cn(
        "flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-opacity disabled:opacity-50",
        primary ? "bg-accent text-bg hover:opacity-90" : "border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
        className,
      )}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      {busy ? "Provisioning…" : label}
    </button>
  );
}
