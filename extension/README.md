# Mtrly Extension

Chrome MV3 extension — pay-per-second content meter.

## Load unpacked (dev mode)

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `extension/` directory
5. Extension icon appears in toolbar

## Architecture

- `background.js` — service worker: routes messages, handles API calls, stores auth token
- `content.js` — injected into every page: calls `/api/match`, shows side panel if URL is registered
- `popup.html` + `popup.js` — toolbar popup: login/logout, balance, top-up button
- `overlay.css` — styles for in-page side panel and full-page overlay

## Phase 0 scope

- Manifest + scaffold only. No billing, no auth token yet.
- Calls `GET /api/match?url=<current>` on every page load.
- If matched, shows side panel with match info. No payment flow yet.

Later phases add billing logic, play/pause detection, paragraph blur, top-up flow.
