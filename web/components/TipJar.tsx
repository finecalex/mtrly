"use client";

import { useEffect, useState } from "react";
import { Heart, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";

const PRESETS = ["0.10", "0.50", "1.00", "5.00"];

type Me = { id: number; balance: string } | null;

export function TipJar({ slug, displayName, recipientUserId }: { slug: string; displayName: string; recipientUserId: number }) {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [amount, setAmount] = useState("0.50");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user) {
          setMe(null);
          return;
        }
        setMe({ id: d.user.id, balance: d.user.balance });
      })
      .catch(() => setMe(null));
  }, []);

  const balance = me ? parseFloat(me.balance) : 0;
  const amt = parseFloat(amount || "0");
  const canTip = !!me && me.id !== recipientUserId && amt > 0 && amt <= balance;
  const isSelf = !!me && me.id === recipientUserId;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!canTip) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toSlug: slug,
          amountUsdc: amount,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push({
          kind: "error",
          title: "Tip failed",
          description: data.error ?? data.message ?? "unknown",
        });
      } else {
        toast.push({
          kind: "success",
          title: `Sent $${parseFloat(data.amount).toFixed(4)} to ${displayName}`,
          description: `${displayName} receives $${parseFloat(data.creatorShare).toFixed(4)} (80%). Balance: $${parseFloat(data.balance).toFixed(4)}.`,
        });
        setAmount("0.50");
        setNote("");
        // refresh own balance
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => d?.user && setMe({ id: d.user.id, balance: d.user.balance }))
          .catch(() => undefined);
      }
    } catch (err) {
      toast.push({
        kind: "error",
        title: "Tip failed",
        description: err instanceof Error ? err.message : "network error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (me === undefined) return null;

  if (me === null) {
    return (
      <div className="rounded-2xl border border-pink-400/30 bg-pink-400/5 p-5">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-pink-400" />
          <h3 className="text-sm font-semibold">Send a tip</h3>
        </div>
        <p className="mt-2 text-sm text-muted">
          Sign up to send {displayName} a one-time tip on top of per-second metering.
        </p>
        <div className="mt-3 flex gap-2">
          <a
            href="/auth/signup"
            className="rounded-lg bg-pink-400 px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            Sign up
          </a>
          <a
            href="/auth/login"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-fg"
          >
            Log in
          </a>
        </div>
      </div>
    );
  }

  if (isSelf) {
    return (
      <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/5 p-4 text-sm text-muted">
        You can&apos;t tip yourself — this is your own page.
      </div>
    );
  }

  return (
    <form onSubmit={send} className="rounded-2xl border border-pink-400/30 bg-gradient-to-br from-pink-400/10 to-pink-500/5 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-pink-400" />
          <h3 className="text-sm font-semibold">Send a tip to {displayName}</h3>
        </div>
        <span className="font-mono text-[10px] uppercase text-muted">
          Balance ${balance.toFixed(4)}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted">
        One-shot bonus on top of per-second metering. 80% goes to {displayName}, 20% to platform —
        same onchain path as ticks.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(p)}
            className={[
              "rounded-md border px-3 py-1 font-mono text-xs transition-colors",
              amount === p
                ? "border-pink-400 bg-pink-400/15 text-pink-300"
                : "border-border bg-surface text-muted hover:text-fg",
            ].join(" ")}
          >
            ${p}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
        <div>
          <Label htmlFor="tip-amount">Amount</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">$</span>
            <Input
              id="tip-amount"
              type="number"
              min="0.01"
              max={Math.min(balance, 50).toFixed(2)}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-6"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tip-note">Note (optional)</Label>
          <Textarea
            id="tip-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 280))}
            maxLength={280}
            rows={1}
            className="mt-1.5"
            placeholder="Loved your last article…"
          />
        </div>
      </div>

      {amt > balance && balance > 0 && (
        <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-red-400">
          <AlertCircle size={11} /> exceeds balance · top up first
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={!canTip || busy} className="bg-pink-400 hover:bg-pink-400/90 text-bg">
          <Send size={14} /> {busy ? "Sending…" : `Send $${amt > 0 ? amt.toFixed(2) : "0.00"}`}
        </Button>
        {balance === 0 && (
          <a href="/balance" className="font-mono text-[10px] uppercase text-muted hover:text-fg">
            top up balance →
          </a>
        )}
      </div>
    </form>
  );
}
