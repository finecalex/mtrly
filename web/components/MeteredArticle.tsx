"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, MousePointerClick, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";

type ParagraphState = "locked" | "paying" | "unlocked";

const PRICE_PER_PARAGRAPH = 0.005;

// Storage key MUST include viewerId. Otherwise demo viewer A's unlocked set
// leaks into demo viewer B on the same browser, and viewer B sees paragraphs
// as already paid → click is a no-op → no /api/billing/tick fires → their
// balance never moves and they think the meter is broken.
function lsKey(viewerId: number | null, contentId: number) {
  const uid = viewerId ?? "anon";
  return `mtrly:paid-paragraphs:${uid}:${contentId}`;
}

function loadPaidFromLocalStorage(viewerId: number | null, contentId: number): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(lsKey(viewerId, contentId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((n) => Number.isInteger(n) && n >= 0);
  } catch {
    return [];
  }
}

function persistPaidToLocalStorage(viewerId: number | null, contentId: number, idxs: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lsKey(viewerId, contentId), JSON.stringify(Array.from(idxs)));
  } catch {
    // quota exceeded or storage disabled — non-fatal
  }
}

export function MeteredArticle({
  paragraphs,
  contentId,
  articleId,
  viewerId,
  isAuthed,
  isOwner,
  initialPaidCount,
}: {
  paragraphs: { idx: number; html: string }[];
  contentId: number;
  articleId: number;
  viewerId: number | null;
  isAuthed: boolean;
  isOwner: boolean;
  initialPaidCount: number;
}) {
  const total = paragraphs.length;

  // Initial render uses ONLY server-supplied data so SSR HTML and the first
  // client render are byte-identical — otherwise React hydration fails with
  // error #423. The localStorage merge runs in a useEffect after mount and
  // can only widen the unlocked set (never re-locks), so we never re-charge
  // a paragraph the user already paid for.
  const serverUnlockSet = useMemo(() => {
    if (isOwner) return new Set(paragraphs.map((p) => p.idx));
    const s = new Set<number>([0]);
    if (!isAuthed) return s;
    for (let i = 1; i <= initialPaidCount && i < total; i++) s.add(i);
    return s;
  }, [paragraphs, isOwner, isAuthed, initialPaidCount, total]);

  const [states, setStates] = useState<Record<number, ParagraphState>>(() => {
    const init: Record<number, ParagraphState> = {};
    paragraphs.forEach((p) => {
      init[p.idx] = serverUnlockSet.has(p.idx) ? "unlocked" : "locked";
    });
    return init;
  });

  // Post-hydration localStorage merge. Bumps any paragraph the user paid
  // for on a previous visit from "locked" to "unlocked". Owner / guest
  // skip — owner already sees everything, guest can't have paid.
  useEffect(() => {
    if (isOwner || !isAuthed) return;
    const fromLs = loadPaidFromLocalStorage(viewerId, contentId);
    if (fromLs.length === 0) return;
    setStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const i of fromLs) {
        if (i < 0 || i >= total) continue;
        if (next[i] === "locked") {
          next[i] = "unlocked";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [isOwner, isAuthed, viewerId, contentId, total]);
  const [revealAnim, setRevealAnim] = useState<Set<number>>(new Set());
  const [coinPop, setCoinPop] = useState<Set<number>>(new Set());
  const sessionRef = useRef<string | null>(null);
  const sessionInflight = useRef<Promise<string | null> | null>(null);
  const toast = useToast();

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionRef.current) return sessionRef.current;
    if (sessionInflight.current) return sessionInflight.current;
    sessionInflight.current = (async () => {
      try {
        const res = await fetch("/api/session/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.sessionId) return null;
        sessionRef.current = data.sessionId as string;
        return sessionRef.current;
      } catch {
        return null;
      } finally {
        sessionInflight.current = null;
      }
    })();
    return sessionInflight.current;
  }, [contentId]);

  const triggerReveal = useCallback((idx: number) => {
    setRevealAnim((prev) => {
      const n = new Set(prev);
      n.add(idx);
      return n;
    });
    setCoinPop((prev) => {
      const n = new Set(prev);
      n.add(idx);
      return n;
    });
    setTimeout(() => {
      setRevealAnim((prev) => {
        const n = new Set(prev);
        n.delete(idx);
        return n;
      });
    }, 900);
    setTimeout(() => {
      setCoinPop((prev) => {
        const n = new Set(prev);
        n.delete(idx);
        return n;
      });
    }, 1300);
  }, []);

  const unlockParagraph = useCallback(
    async (idx: number) => {
      if (states[idx] !== "locked") return;
      setStates((s) => ({ ...s, [idx]: "paying" }));
      const sid = await ensureSession();
      if (!sid) {
        setStates((s) => ({ ...s, [idx]: "locked" }));
        toast.push({
          kind: "error",
          title: "Couldn't start the meter",
          description: "Try again in a moment.",
        });
        return;
      }
      try {
        const res = await fetch("/api/billing/tick", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        });
        if (res.status === 402) {
          setStates((s) => ({ ...s, [idx]: "locked" }));
          toast.push({
            kind: "error",
            title: "Out of balance",
            description: "Top up to keep reading.",
            href: "/balance",
            hrefLabel: "Top up",
          });
          return;
        }
        if (!res.ok) {
          setStates((s) => ({ ...s, [idx]: "locked" }));
          toast.push({ kind: "error", title: "Tick failed", description: "Please try again." });
          return;
        }
        setStates((s) => ({ ...s, [idx]: "unlocked" }));
        triggerReveal(idx);
        // Persist the paid index so reload on this device keeps the paragraph
        // open instead of re-charging.
        const nextSet = new Set<number>([0, idx]);
        Object.entries(states).forEach(([k, v]) => {
          if (v === "unlocked") nextSet.add(Number(k));
        });
        persistPaidToLocalStorage(viewerId, contentId, nextSet);
      } catch {
        setStates((s) => ({ ...s, [idx]: "locked" }));
        toast.push({ kind: "error", title: "Network glitch", description: "Try once more." });
      }
    },
    [states, ensureSession, toast, triggerReveal, contentId, viewerId],
  );

  // Owner-mode preview: nothing to meter, but still mark all unlocked.
  useEffect(() => {
    if (!isOwner) return;
    setStates((prev) => {
      const next = { ...prev };
      paragraphs.forEach((p) => (next[p.idx] = "unlocked"));
      return next;
    });
  }, [isOwner, paragraphs]);

  const unlockedCount = Object.values(states).filter((v) => v === "unlocked").length;

  return (
    <article className="mt-10 space-y-6 text-base leading-relaxed">
      {paragraphs.map((p) => {
        const state = states[p.idx] ?? "locked";
        const isFirst = p.idx === 0;
        const isUnlocked = state === "unlocked";
        const isPaying = state === "paying";
        const animatingReveal = revealAnim.has(p.idx);
        const showingCoin = coinPop.has(p.idx);

        if (isFirst || isUnlocked) {
          return (
            <div key={p.idx} className="relative">
              <p
                data-mtrly-paragraph={p.idx}
                data-mtrly-state={isFirst ? "free" : "unlocked"}
                className={animatingReveal ? "animate-mtrly-reveal" : undefined}
                dangerouslySetInnerHTML={{ __html: p.html }}
              />
              {animatingReveal && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sparkle-sweep bg-gradient-to-r from-transparent via-accent/25 to-transparent"
                />
              )}
              {showingCoin && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 animate-coin-pop rounded-full border border-accent/60 bg-bg/95 px-2 py-0.5 font-mono text-[10px] uppercase text-accent shadow-[0_0_18px_rgba(124,255,124,0.45)]"
                >
                  + $0.005
                </span>
              )}
            </div>
          );
        }

        // Locked / paying — div with role=button instead of <button>, because
        // the paragraph HTML can contain <a> tags which are invalid inside
        // <button> and steal the click on browsers that render the <a> as
        // interactive. The locked text is hidden behind blur+pointer-events
        // anyway, so the only real click target is the wrapper.
        const handleActivate = () => {
          if (isPaying) return;
          if (!isAuthed) {
            window.location.href = `/auth/signup?next=/a/${articleId}`;
            return;
          }
          unlockParagraph(p.idx);
        };

        return (
          <div key={p.idx} className="group relative">
            <div
              role="button"
              tabIndex={0}
              onClick={handleActivate}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleActivate();
                }
              }}
              data-mtrly-paragraph={p.idx}
              data-mtrly-state={state}
              aria-label={isAuthed ? `Reveal paragraph ${p.idx + 1} for $0.005` : "Sign up to read more"}
              aria-disabled={isPaying || undefined}
              className={[
                "block w-full text-left transition-all",
                isPaying ? "cursor-progress" : "cursor-pointer",
              ].join(" ")}
            >
              <p
                // Inline content has pointer-events disabled so any <a> tags
                // rendered from markdown can't intercept the wrapper click.
                className={[
                  "select-none pointer-events-none rounded-lg p-3 -mx-3",
                  "blur-sm saturate-50 brightness-90",
                  isPaying ? "animate-pulse" : "group-hover:blur-[3px] group-hover:brightness-100",
                  !isPaying && "animate-pulse-soft",
                ].filter(Boolean).join(" ")}
                dangerouslySetInnerHTML={{ __html: p.html }}
              />
              <span
                className={[
                  "pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2",
                  "flex items-center justify-center",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex items-center gap-2 rounded-full border px-3.5 py-1.5",
                    "font-mono text-[11px] uppercase tracking-wide backdrop-blur-md",
                    "transition-all duration-200",
                    isPaying
                      ? "border-accent/60 bg-accent/15 text-accent"
                      : "border-accent/40 bg-bg/85 text-accent group-hover:scale-[1.04] group-hover:border-accent/80 group-hover:bg-accent/10",
                  ].join(" ")}
                >
                  {isPaying ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      paying $0.005…
                    </>
                  ) : isAuthed ? (
                    <>
                      <MousePointerClick size={12} />
                      tap to reveal · $0.005
                    </>
                  ) : (
                    <>
                      <Lock size={12} />
                      sign up to read
                    </>
                  )}
                </span>
              </span>
            </div>
          </div>
        );
      })}

      {isAuthed && !isOwner && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface/40 p-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span>
              <span className="text-fg tabular-nums">{unlockedCount}</span> /{" "}
              <span className="tabular-nums">{total}</span> revealed ·{" "}
              <span className="text-accent tabular-nums">
                ${(Math.max(0, unlockedCount - 1) * PRICE_PER_PARAGRAPH).toFixed(3)}
              </span>{" "}
              spent so far
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase">
            tap any paragraph to keep reading · first one&apos;s on the house
          </span>
        </div>
      )}

      {!isAuthed && (
        <div className="mt-12 rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
          <h3 className="text-lg font-semibold">{total - 1} more paragraphs locked</h3>
          <p className="mt-1 text-sm text-muted">
            Tap each one to unlock — pay $0.005 only for what you actually read.
          </p>
          <Link
            href={`/auth/signup?next=/a/${articleId}`}
            className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            Sign up · ${(total * PRICE_PER_PARAGRAPH).toFixed(3)} max to read it all
          </Link>
        </div>
      )}
    </article>
  );
}
