"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error" | "info";
type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
};

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return { push: () => undefined };
  }
  return ctx;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:w-auto">
        {items.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.kind === "success" ? Check : toast.kind === "error" ? AlertCircle : Info;
  const tone =
    toast.kind === "success" ? "border-accent/40 bg-accent/10 text-accent"
    : toast.kind === "error" ? "border-red-400/40 bg-red-400/10 text-red-400"
    : "border-border bg-surface text-fg";
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface/95 p-3 shadow-2xl backdrop-blur",
        tone,
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-fg">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 break-words text-xs text-muted">{toast.description}</div>
        )}
        {toast.href && (
          <a
            href={toast.href}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block font-mono text-[10px] uppercase text-accent hover:underline"
          >
            {toast.hrefLabel ?? "open"}
          </a>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 text-muted hover:bg-bg hover:text-fg"
        aria-label="dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
