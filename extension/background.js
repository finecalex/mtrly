const API_BASE = "https://circlearc-59513674.slonix.dev";

const tabState = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log("[mtrly] extension installed");
});

async function apiFetch(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (msg.type === "match") {
    fetch(`${API_BASE}/api/match?url=${encodeURIComponent(msg.url)}`)
      .then((r) => r.json())
      .then((data) => sendResponse(data))
      .catch((e) => sendResponse({ match: false, error: e.message }));
    return true;
  }

  if (msg.type === "me") {
    apiFetch("/api/auth/me")
      .then(({ data }) => sendResponse(data))
      .catch((e) => sendResponse({ user: null, error: e.message }));
    return true;
  }

  if (msg.type === "fetch") {
    apiFetch(msg.path, msg.init || {})
      .then(({ status, data }) => sendResponse({ status, ...data }))
      .catch((e) => sendResponse({ status: 0, error: e.message }));
    return true;
  }

  if (msg.type === "sessionStart") {
    apiFetch("/api/session/start", {
      method: "POST",
      body: JSON.stringify({ normalizedUrl: msg.normalizedUrl }),
    })
      .then(({ status, data }) => {
        if (status === 200 && data.ok && tabId != null) {
          tabState.set(tabId, { sessionId: data.sessionId });
        }
        sendResponse({ status, ...data });
      })
      .catch((e) => sendResponse({ status: 0, error: e.message }));
    return true;
  }

  if (msg.type === "tick") {
    const st = tabId != null ? tabState.get(tabId) : null;
    const sid = msg.sessionId ?? st?.sessionId;
    if (!sid) {
      sendResponse({ status: 400, ok: false, reason: "no_session" });
      return true;
    }
    apiFetch("/api/billing/tick", {
      method: "POST",
      body: JSON.stringify({ sessionId: sid }),
    })
      .then(({ status, data }) => sendResponse({ status, ...data }))
      .catch((e) => sendResponse({ status: 0, error: e.message }));
    return true;
  }

  if (msg.type === "sessionEnd") {
    const st = tabId != null ? tabState.get(tabId) : null;
    const sid = msg.sessionId ?? st?.sessionId;
    if (tabId != null) tabState.delete(tabId);
    if (!sid) {
      sendResponse({ ok: true, noop: true });
      return true;
    }
    apiFetch("/api/session/end", {
      method: "POST",
      body: JSON.stringify({ sessionId: sid }),
    })
      .then(({ status, data }) => sendResponse({ status, ...data }))
      .catch((e) => sendResponse({ status: 0, error: e.message }));
    return true;
  }

});

chrome.tabs.onRemoved.addListener((tabId) => {
  const st = tabState.get(tabId);
  if (st?.sessionId) {
    apiFetch("/api/session/end", {
      method: "POST",
      body: JSON.stringify({ sessionId: st.sessionId }),
    }).catch(() => {});
  }
  tabState.delete(tabId);
});
