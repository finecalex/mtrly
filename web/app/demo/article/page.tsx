export const metadata = {
  title: "Demo article — Mtrly",
};

export default function DemoArticle() {
  return (
    <main className="mx-auto max-w-3xl px-8 py-16">
      <div className="font-mono text-xs uppercase text-muted">mtrly / demo article</div>
      <h1 className="mt-4 text-4xl font-semibold">The meter is the product</h1>
      <p className="mt-2 text-sm text-muted">
        A short demonstration of Mtrly&apos;s per-paragraph paywall on Arc testnet.
      </p>

      <article className="mt-10 space-y-6 text-base leading-relaxed">
        <p>
          The internet settled on a binary a long time ago. A page is either free,
          funded by ads that track you across the web, or it&apos;s behind a
          subscription that demands a long-term commitment before you&apos;ve read a
          single word. Neither option respects the fact that most of what people
          consume online is a single article, a single video, a single moment of
          curiosity. Mtrly&apos;s bet is that nanopayments, billed per paragraph
          read or per second of video, make a third path possible.
        </p>
        <p>
          Arc is a stablecoin-native rollup where USDC is the gas token. That
          single detail matters more than it sounds. Normal L2s bill you in ETH
          for every transaction, which means sub-cent payments are a fantasy —
          the gas exceeds the payment. Arc flips this: if you&apos;re paying in
          USDC anyway, then a transaction that moves two-hundredths of a penny
          worth of USDC is completely coherent with the gas model. Circle&apos;s
          Nanopayments layer then batches these offchain so you don&apos;t even
          pay gas for most of them.
        </p>
        <p>
          The Mtrly extension watches the page you&apos;re on. If the URL is
          registered by a creator — a YouTube video, a blog post, a podcast
          transcript — the extension opens a session with the Mtrly backend and
          starts a clock. Every five seconds for video, or the moment a
          paragraph scrolls into view for text, it calls the billing engine.
          The engine atomically debits your balance, credits 80% to the
          creator, and keeps 20% for the platform. No sign-up forms for each
          site. No subscription lock-ins. Just attention priced in hundredths
          of a cent.
        </p>
        <p>
          The critical UX question is what happens when the money runs out.
          Traditional paywalls slam a wall down and demand you commit to a plan.
          Mtrly&apos;s wall is softer: the extension pauses the video or
          re-blurs the next paragraph, and offers a top-up button that takes
          you to a balance page. You top up $1. You return. You keep reading.
          The meter keeps ticking. You paid two cents for the half-article you
          actually read, and neither you nor the creator had to sign anything.
        </p>
        <p>
          There is an obvious question about trust. How do I know the extension
          isn&apos;t running the meter while I&apos;m making a coffee? The
          answer is video-element event listeners — the meter only ticks while
          the video is actually playing, and for text only the moment a paragraph
          scrolls past the fifty-percent visibility threshold (with a tiny
          200ms debounce so flicking past doesn&apos;t bill you). The extension
          is open-source; the content script is fifty lines. If you don&apos;t
          trust it, you can read it.
        </p>
        <p>
          The harder question is collusion: what stops a creator from
          registering a URL, then running a bot that opens the page a thousand
          times to drain their own balance — or a competitor&apos;s? The honest
          answer is: nothing, in the hackathon build. The production design
          adds rate-limits per (viewer, creator) pair, challenge-response proofs
          of human attention, and a dispute window before offchain settlements
          are pushed onchain via Circle&apos;s x402 batch. For now, the
          simpler system demonstrates the economics.
        </p>
        <p>
          If this works, the shape of the web changes slightly. Creators stop
          begging for monthly subscribers and start being paid for attention
          they actually capture. Readers stop installing adblockers because
          there are no ads to block. And the entire machinery runs on a
          blockchain settlement layer that, on any given second, is moving
          amounts of money too small for any traditional payment rail to
          profitably handle.
        </p>
      </article>
    </main>
  );
}
