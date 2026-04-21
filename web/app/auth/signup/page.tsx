"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
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
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
        displayName: fd.get("displayName"),
        role: fd.get("role") ?? "viewer",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "signup failed");
      setLoading(false);
      return;
    }
    router.push(ext ? "/auth/extension/bridge" : "/balance");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-8">
      <div className="font-mono text-xs uppercase text-muted">mtrly / signup</div>
      <h1 className="mt-3 text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-muted">
        A Circle dev-controlled wallet is provisioned on Arc Testnet automatically.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field name="email" type="email" label="Email" required autoComplete="email" />
        <Field name="displayName" label="Display name" />
        <Field name="password" type="password" label="Password (8+ chars)" required minLength={8} autoComplete="new-password" />

        <div>
          <label className="block text-xs uppercase text-muted">Role</label>
          <select name="role" className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm">
            <option value="viewer">Viewer</option>
            <option value="creator">Creator</option>
          </select>
        </div>

        {error && <div className="rounded border border-red-500 bg-red-950/30 px-3 py-2 font-mono text-xs text-red-300">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded border border-accent bg-accent py-3 font-mono text-sm text-bg hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Creating wallet…" : "Sign up →"}
        </button>
      </form>

      <div className="mt-6 text-sm text-muted">
        Already have an account? <Link href={`/auth/login${ext ? "?ext=1" : ""}`} className="text-fg underline">Log in</Link>
      </div>
    </main>
  );
}

function Field({
  name, label, type = "text", ...rest
}: { name: string; label: string; type?: string; required?: boolean; minLength?: number; autoComplete?: string }) {
  return (
    <div>
      <label className="block text-xs uppercase text-muted" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        {...rest}
        className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-fg"
      />
    </div>
  );
}
