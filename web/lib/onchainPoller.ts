// Server-side heartbeat: every POLL_INTERVAL_MS we POST to our own
// /api/gateway/resolve endpoint, which walks recent Payments and stamps
// onchainTxHash + flips settledOnchain=true.
//
// Why HTTP instead of importing the SDK directly here? The Circle x402
// batching client pulls in `crypto` and other Node built-ins that webpack
// can't resolve from the instrumentation bundle. Calling our own API route
// keeps all SDK code where it already works (API request handlers) and
// makes instrumentation a tiny dependency-free file.
const POLL_INTERVAL_MS = 5000;

let started = false;
let consecutiveFailures = 0;

function selfUrl(): string {
  // Inside the container we can hit ourselves on localhost; use the public
  // URL only as a fallback for local dev outside Docker.
  return process.env.MTRLY_INTERNAL_URL ?? "http://127.0.0.1:3000";
}

async function tickOnce(): Promise<void> {
  const res = await fetch(`${selfUrl()}/api/gateway/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`resolve responded ${res.status}`);
  }
  const data = (await res.json().catch(() => ({}))) as {
    resolved?: number;
    flagged?: number;
    pending?: number;
  };
  if ((data.resolved ?? 0) > 0 || (data.flagged ?? 0) > 0) {
    console.log(
      `[onchain-poller] resolved=${data.resolved ?? 0} flagged=${data.flagged ?? 0} pending=${data.pending ?? 0}`,
    );
  }
}

export function startOnchainPoller(): void {
  if (started) return;
  if (typeof setInterval !== "function") return;
  started = true;
  // Stagger first run so the HTTP server is ready to accept requests.
  setTimeout(() => void runLoop(), 8000);
}

async function runLoop(): Promise<void> {
  while (true) {
    try {
      await tickOnce();
      consecutiveFailures = 0;
    } catch (e) {
      consecutiveFailures++;
      const wait = Math.min(60_000, POLL_INTERVAL_MS * Math.max(1, consecutiveFailures));
      console.error(
        `[onchain-poller] tick failed (#${consecutiveFailures}), backing off ${wait}ms:`,
        e instanceof Error ? e.message : e,
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}
