"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DemoAccountButton } from "@/components/DemoAccountButton";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const ext = search.get("ext") === "1";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "login failed");
      setLoading(false);
      return;
    }
    router.push(ext ? "/auth/extension/bridge" : "/balance");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-8">
      <div className="font-mono text-xs uppercase text-muted">mtrly / login</div>
      <h1 className="mt-3 text-3xl font-semibold">Log in</h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-xs uppercase text-muted" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
          />
        </div>
        <div>
          <label className="block text-xs uppercase text-muted" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
          />
        </div>

        {error && <div className="rounded border border-red-500 bg-red-950/30 px-3 py-2 font-mono text-xs text-red-300">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded border border-accent bg-accent py-3 font-mono text-sm text-bg hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "…" : "Log in"}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
        <DemoAccountButton primary label="Or try as demo viewer" />
      </div>
      <p className="mt-2 text-xs text-muted">
        Skip the form. We provision an account, $5 internal balance, and seed your onchain Gateway
        pool from the platform. Two fresh arcscan tx per click.
      </p>

      <div className="mt-6 text-sm text-muted">
        No account? <Link href={`/auth/signup${ext ? "?ext=1" : ""}`} className="text-fg underline">Sign up</Link>
      </div>
    </main>
  );
}
