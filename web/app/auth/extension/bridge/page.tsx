"use client";

import { useEffect, useState } from "react";

export default function ExtensionBridgePage() {
  const [status, setStatus] = useState<"checking" | "ready" | "anon">("checking");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/extension-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.token) {
          setToken(d.token);
          setStatus("ready");
          window.postMessage({ type: "mtrly-token", token: d.token }, "*");
        } else {
          setStatus("anon");
        }
      })
      .catch(() => setStatus("anon"));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-8">
      <div className="font-mono text-xs uppercase text-muted">mtrly / extension bridge</div>
      <h1 className="mt-3 text-3xl font-semibold">
        {status === "checking" && "Connecting extension…"}
        {status === "ready" && "Extension connected ✓"}
        {status === "anon" && "Log in first"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {status === "ready" && "Token handed to the extension. You can close this tab."}
        {status === "anon" && "This page syncs your login token to the Chrome extension."}
      </p>
      {token && (
        <div
          id="mtrly-ext-token"
          data-token={token}
          className="mt-6 rounded border border-border bg-surface p-3 font-mono text-xs break-all"
        >
          {token}
        </div>
      )}
    </main>
  );
}
