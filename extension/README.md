# Mtrly Extension

Chrome MV3 extension — pay-per-second content meter on Arc testnet.

## Load unpacked (dev mode)

### Option A — download the prebuilt zip

1. Download: https://circlearc-59513674.slonix.dev/mtrly-extension.zip
2. Unzip to a directory of your choice
3. Open `chrome://extensions/` → enable **Developer mode** → **Load unpacked** → select the unzipped folder

### Option B — from the repo

1. `git clone git@github.com:finecalex/mtrly.git`
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select `mtrly/extension/`
6. The Mtrly icon appears in your toolbar

## Using it

1. Click the toolbar icon → **Log in**. You&apos;ll be redirected to the Mtrly web-app to sign up or log in. An Arc-testnet EOA wallet is provisioned for you automatically by Circle.
2. Go to `/balance` and top up (testnet demo: the admin endpoint credits USDC directly; in prod this will be an onchain deposit watcher).
3. Visit a registered URL. For the hackathon demo:
   - YouTube video: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Article: `https://circlearc-59513674.slonix.dev/demo/article`
4. A side panel appears in the top-right showing live balance and spend-so-far.

### Video (YouTube)

- The meter ticks every 5 seconds while the video is playing.
- Each tick debits `$0.05/min ÷ 12 ≈ $0.00416667` USDC from your balance.
- Pausing the video pauses the meter.
- Running out of balance pauses the video and shows a "top up" overlay.

### Text (articles)

- The first paragraph is free.
- Every subsequent paragraph is blurred with a `$0.005` badge.
- Dwelling on a blurred paragraph (≥50% in viewport) for 3 consecutive seconds debits $0.005 and unblurs it.
- Refreshing the page does not re-bill you for paragraphs you already paid for.

## Architecture

- `background.js` — MV3 service worker; routes messages; all API calls use `credentials: "include"` to carry the session cookie; tracks `sessionId` per tab.
- `content.js` — content script injected into every page; calls `/api/match`, attaches `play`/`pause` listeners to `<video>`, runs the 5-sec tick timer, or (for text) an `IntersectionObserver` + 3-sec dwell timer.
- `popup.html` + `popup.js` — toolbar popup with auth status, balance, log-in and top-up buttons.
- `overlay.css` — styles for the side panel, the blocking overlay, and paragraph blur.

## Build / package

No build step — load the directory unpacked. To ship a `.zip` for a Chrome Web Store submission:

```bash
cd extension
zip -r mtrly-extension.zip . -x '*.git*' -x 'README.md'
```

## Permissions (manifest v3)

- `storage` + `cookies` — auth persistence
- `tabs` + `activeTab` + `scripting` — content-script interaction
- `host_permissions: <all_urls>` — required so the extension can detect any URL you visit and decide whether to meter it

The extension **only** contacts `https://circlearc-59513674.slonix.dev` for API calls. It does not send your browsing history anywhere.
