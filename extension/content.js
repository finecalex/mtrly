(function () {
  const TICK_SEC = 5;
  let currentMatch = null;
  let currentSessionId = null;
  let tickTimer = null;
  let spent = 0;
  let lastBalance = null;

  function sendMessage(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => resolve(res));
      } catch (e) {
        resolve(null);
      }
    });
  }

  function findVideoEl() {
    return document.querySelector("video");
  }

  function injectPanel(match) {
    if (document.getElementById("mtrly-panel")) return;
    const panel = document.createElement("div");
    panel.id = "mtrly-panel";
    panel.innerHTML = `
      <div class="mtrly-panel-header">
        <span class="mtrly-logo">mtrly</span>
        <span class="mtrly-status" id="mtrly-status">●</span>
      </div>
      <div class="mtrly-row"><span>Balance</span><b id="mtrly-balance">—</b></div>
      <div class="mtrly-row"><span>This view</span><b id="mtrly-spent">$0.00</b></div>
      <div class="mtrly-row"><span>Rate</span><b>$${match.price}/${match.unit}</b></div>
      <div class="mtrly-row"><span>Creator</span><b>${match.creator?.displayName ?? "—"}</b></div>
      <div class="mtrly-footer">
        <span class="mtrly-chain">Arc Testnet</span>
        <a class="mtrly-proof" href="https://circlearc-59513674.slonix.dev/balance" target="_blank" rel="noreferrer">settlement proof ↗</a>
      </div>
    `;
    document.documentElement.appendChild(panel);
  }

  function updatePanel({ balance, spent: s, status }) {
    const b = document.getElementById("mtrly-balance");
    const sp = document.getElementById("mtrly-spent");
    const st = document.getElementById("mtrly-status");
    if (b && balance != null) b.textContent = `$${Number(balance).toFixed(4)}`;
    if (sp && s != null) sp.textContent = `$${Number(s).toFixed(5)}`;
    if (st && status) {
      st.textContent = status === "playing" ? "●" : status === "blocked" ? "✕" : "○";
      st.style.color = status === "playing" ? "#7cff7c" : status === "blocked" ? "#ff6b6b" : "#8a8a8a";
    }
  }

  function showBlockingOverlay(reason) {
    if (document.getElementById("mtrly-overlay")) return;
    const ov = document.createElement("div");
    ov.id = "mtrly-overlay";
    ov.innerHTML = `
      <div class="mtrly-overlay-card">
        <div class="mtrly-overlay-title">${reason === "insufficient" ? "Out of balance" : "Sign in to continue"}</div>
        <div class="mtrly-overlay-sub">
          ${reason === "insufficient"
            ? "Top up your Mtrly balance to resume playback."
            : "Log in to Mtrly — video is paywalled per second."}
        </div>
        <button id="mtrly-overlay-btn" class="mtrly-overlay-btn">
          ${reason === "insufficient" ? "Top up" : "Log in"}
        </button>
      </div>
    `;
    document.documentElement.appendChild(ov);
    const btn = document.getElementById("mtrly-overlay-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        const target = reason === "insufficient"
          ? "https://circlearc-59513674.slonix.dev/balance"
          : "https://circlearc-59513674.slonix.dev/auth/login?ext=1";
        window.open(target, "_blank");
      });
    }
  }

  function hideBlockingOverlay() {
    const ov = document.getElementById("mtrly-overlay");
    if (ov) ov.remove();
  }

  async function tickOnce() {
    const res = await sendMessage({ type: "tick", sessionId: currentSessionId });
    if (!res) return;

    if (res.status === 402 || res.reason === "insufficient") {
      stopTicker();
      pauseVideo();
      showBlockingOverlay("insufficient");
      updatePanel({ balance: lastBalance, spent, status: "blocked" });
      return;
    }

    if (res.status === 401) {
      stopTicker();
      pauseVideo();
      showBlockingOverlay("unauthorized");
      updatePanel({ balance: null, spent, status: "blocked" });
      return;
    }

    if (res.ok) {
      spent = Number(res.totalSpent ?? spent);
      lastBalance = res.balance;
      updatePanel({ balance: res.balance, spent, status: "playing" });
    }
  }

  function startTicker() {
    if (tickTimer) return;
    tickOnce();
    tickTimer = setInterval(tickOnce, TICK_SEC * 1000);
    updatePanel({ balance: lastBalance, spent, status: "playing" });
  }

  function stopTicker() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    updatePanel({ balance: lastBalance, spent, status: "paused" });
  }

  function pauseVideo() {
    const v = findVideoEl();
    if (v && !v.paused) v.pause();
  }

  async function ensureSession() {
    if (currentSessionId) return currentSessionId;
    if (!currentMatch) return null;
    const res = await sendMessage({
      type: "sessionStart",
      normalizedUrl: currentMatch.normalizedUrl,
    });
    if (res && res.ok && res.sessionId) {
      currentSessionId = res.sessionId;
      return res.sessionId;
    }
    if (res && res.status === 401) {
      showBlockingOverlay("unauthorized");
    }
    if (res && res.error === "own_content") {
      // Creator viewing own content — show panel but don't bill
    }
    return null;
  }

  function attachVideoListeners(video) {
    if (video.dataset.mtrlyAttached) return;
    video.dataset.mtrlyAttached = "1";

    video.addEventListener("play", async () => {
      hideBlockingOverlay();
      const sid = await ensureSession();
      if (sid) startTicker();
    });
    video.addEventListener("pause", stopTicker);
    video.addEventListener("ended", () => {
      stopTicker();
      endSession();
    });

    if (!video.paused && !video.ended) {
      ensureSession().then((sid) => { if (sid) startTicker(); });
    }
  }

  async function endSession() {
    stopTicker();
    if (currentSessionId) {
      await sendMessage({ type: "sessionEnd", sessionId: currentSessionId });
      currentSessionId = null;
    }
  }

  function waitForVideo(timeoutMs = 15000) {
    return new Promise((resolve) => {
      const existing = findVideoEl();
      if (existing) return resolve(existing);
      const mo = new MutationObserver(() => {
        const v = findVideoEl();
        if (v) {
          mo.disconnect();
          resolve(v);
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        mo.disconnect();
        resolve(findVideoEl());
      }, timeoutMs);
    });
  }

  async function hydrateBalance() {
    const res = await sendMessage({ type: "me" });
    if (res?.user?.balance != null) {
      lastBalance = res.user.balance;
      updatePanel({ balance: lastBalance, spent, status: "paused" });
    } else if (res && !res.user) {
      showBlockingOverlay("unauthorized");
    }
  }

  async function bootstrap(url) {
    const matchRes = await sendMessage({ type: "match", url });
    if (!matchRes || !matchRes.match) return;
    currentMatch = matchRes;
    injectPanel(matchRes);
    await hydrateBalance();

    if (matchRes.kind === "youtube") {
      const video = await waitForVideo();
      if (video) attachVideoListeners(video);
    } else if (matchRes.kind === "web") {
      await setupTextPaywall(matchRes);
    }
  }

  async function setupTextPaywall(match) {
    const DWELL_MS = 3000;
    const FREE_PARAGRAPHS = 1;

    const consumptionRes = await sendMessage({
      type: "fetch",
      path: `/api/consumption?url=${encodeURIComponent(window.location.href)}`,
    });
    const alreadyPaidCount = Number(consumptionRes?.unitsConsumed ?? 0);
    const paidIdxSet = new Set();
    for (let i = 0; i < alreadyPaidCount; i++) paidIdxSet.add(i + FREE_PARAGRAPHS);

    const paragraphs = findParagraphs();
    if (paragraphs.length === 0) return;

    paragraphs.forEach((p, i) => {
      if (i < FREE_PARAGRAPHS || paidIdxSet.has(i)) {
        p.dataset.mtrlyParagraph = "free";
        return;
      }
      blurParagraph(p, i);
    });

    const total = paragraphs.length;
    updateTextPanel({ total, paid: paidIdxSet.size + FREE_PARAGRAPHS });

    const dwellTimers = new Map();

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const idx = Number(el.dataset.mtrlyIdx);
        if (el.dataset.mtrlyState === "unlocked") continue;

        if (entry.intersectionRatio > 0.5) {
          if (dwellTimers.has(idx)) continue;
          const t = setTimeout(async () => {
            dwellTimers.delete(idx);
            await unlockParagraph(el, idx, match);
          }, DWELL_MS);
          dwellTimers.set(idx, t);
        } else {
          const t = dwellTimers.get(idx);
          if (t) {
            clearTimeout(t);
            dwellTimers.delete(idx);
          }
        }
      }
    }, { threshold: [0, 0.5, 1] });

    paragraphs.forEach((p) => { if (p.dataset.mtrlyState === "locked") io.observe(p); });

    async function unlockParagraph(el, idx, match) {
      const sid = await ensureSession();
      if (!sid) return;

      const res = await sendMessage({ type: "tick", sessionId: sid });
      if (res?.status === 402) {
        showBlockingOverlay("insufficient");
        return;
      }
      if (!res?.ok) return;

      el.dataset.mtrlyState = "unlocked";
      el.classList.remove("mtrly-blurred");
      const badge = el.querySelector(".mtrly-paragraph-badge");
      if (badge) badge.remove();
      io.unobserve(el);
      spent = Number(res.totalSpent ?? spent);
      lastBalance = res.balance;
      paidIdxSet.add(idx);
      updateTextPanel({ total, paid: paidIdxSet.size + FREE_PARAGRAPHS });
      updatePanel({ balance: res.balance, spent, status: "playing" });
    }
  }

  function findParagraphs() {
    const containers = [
      document.querySelector("article"),
      document.querySelector("main"),
      document.querySelector('[role="main"]'),
      document.body,
    ].filter(Boolean);

    for (const c of containers) {
      const ps = Array.from(c.querySelectorAll("p"))
        .filter((p) => p.textContent && p.textContent.trim().length > 80);
      if (ps.length >= 2) return ps;
    }
    return [];
  }

  function blurParagraph(el, idx) {
    el.dataset.mtrlyIdx = String(idx);
    el.dataset.mtrlyState = "locked";
    el.classList.add("mtrly-blurred");
    if (!el.querySelector(".mtrly-paragraph-badge")) {
      const badge = document.createElement("span");
      badge.className = "mtrly-paragraph-badge";
      badge.textContent = "mtrly · $0.005";
      el.appendChild(badge);
    }
  }

  function updateTextPanel({ total, paid }) {
    const panel = document.getElementById("mtrly-panel");
    if (!panel) return;
    let textRow = document.getElementById("mtrly-text-stats");
    if (!textRow) {
      textRow = document.createElement("div");
      textRow.className = "mtrly-row";
      textRow.id = "mtrly-text-stats";
      textRow.innerHTML = `<span>Paragraphs</span><b id="mtrly-text-stats-val">—</b>`;
      panel.appendChild(textRow);
    }
    const val = document.getElementById("mtrly-text-stats-val");
    if (val) val.textContent = `${paid}/${total}`;
  }

  bootstrap(window.location.href);

  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      endSession().then(() => {
        document.getElementById("mtrly-panel")?.remove();
        hideBlockingOverlay();
        currentMatch = null;
        spent = 0;
        bootstrap(lastUrl);
      });
    }
  });
  urlObserver.observe(document, { subtree: true, childList: true });

  window.addEventListener("beforeunload", () => {
    if (currentSessionId) {
      try { chrome.runtime.sendMessage({ type: "sessionEnd", sessionId: currentSessionId }); } catch (_) {}
    }
  });
})();
