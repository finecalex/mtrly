const API_BASE = "https://circlearc-59513674.slonix.dev";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[mtrly] extension installed");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "match") {
    fetch(`${API_BASE}/api/match?url=${encodeURIComponent(msg.url)}`)
      .then((r) => r.json())
      .then((data) => sendResponse(data))
      .catch((e) => sendResponse({ match: false, error: e.message }));
    return true;
  }

  if (msg.type === "getToken") {
    chrome.storage.local.get(["token"], (res) => sendResponse({ token: res.token ?? null }));
    return true;
  }

  if (msg.type === "setToken") {
    chrome.storage.local.set({ token: msg.token }, () => sendResponse({ ok: true }));
    return true;
  }
});
