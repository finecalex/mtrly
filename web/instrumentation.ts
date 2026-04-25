// Next.js calls register() exactly once on server start (per worker). We use
// it to kick off background loops that should run for the lifetime of the
// process — currently only the onchain settlement poller.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startOnchainPoller } = await import("./lib/onchainPoller");
  startOnchainPoller();
}
