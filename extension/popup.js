const API_BASE = "https://circlearc-59513674.slonix.dev";
const PLATFORM_GATEWAY_ADDR = "0x518dBC8D650666889575178E8f0bDDcDd68063B1";
const PLATFORM_EXPLORER_URL = `https://testnet.arcscan.app/address/${PLATFORM_GATEWAY_ADDR}`;

const authStatusEl = document.getElementById("auth-status");
const balanceEl = document.getElementById("balance");
const loginBtn = document.getElementById("login-btn");
const topupBtn = document.getElementById("topup-btn");
const explorerBtn = document.getElementById("explorer-btn");

const walletSection = document.getElementById("wallet-section");
const walletLink = document.getElementById("wallet-link");
const walletAddrEl = document.getElementById("wallet-addr");

const activitySection = document.getElementById("activity-section");
const activityList = document.getElementById("activity-list");
const allActivityLink = document.getElementById("all-activity-link");
const totalPaymentsEl = document.getElementById("total-payments");
const totalOnchainEl = document.getElementById("total-onchain");
const totalVolumeEl = document.getElementById("total-volume");

function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function timeAgo(iso) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function fmtAmount(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "0";
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function setLoggedIn(user) {
  authStatusEl.textContent = user.displayName || user.email;
  balanceEl.textContent = `$${Number(user.balance ?? 0).toFixed(4)}`;
  loginBtn.textContent = "Open dashboard";
  walletSection.style.display = "block";
  activitySection.style.display = "block";
  explorerBtn.style.display = "block";
  loadWallet();
  loadActivity();
}

function setLoggedOut() {
  authStatusEl.textContent = "Logged out";
  balanceEl.textContent = "—";
  loginBtn.textContent = "Log in";
  walletSection.style.display = "none";
  activitySection.style.display = "none";
  explorerBtn.style.display = "none";
}

function loadWallet() {
  chrome.runtime.sendMessage(
    { type: "fetch", path: "/api/wallet/mine" },
    (res) => {
      if (!res || !res.address) {
        walletSection.style.display = "none";
        return;
      }
      walletAddrEl.textContent = shortAddr(res.address);
      walletAddrEl.title = res.address;
      walletLink.href = res.explorerUrl || PLATFORM_EXPLORER_URL;
      explorerBtn.dataset.url = res.explorerUrl || PLATFORM_EXPLORER_URL;
    },
  );
}

function loadActivity() {
  chrome.runtime.sendMessage(
    { type: "fetch", path: "/api/wallet/mine/activity" },
    (res) => {
      if (!res || res.status === 401 || !res.ok) {
        activityList.innerHTML = '<div class="empty">No ticks yet.</div>';
        return;
      }
      const items = Array.isArray(res.items) ? res.items : [];
      const totals = res.totals || { payments: 0, onchainSettled: 0, volumeUsdc: "0" };

      totalPaymentsEl.textContent = String(totals.payments);
      totalOnchainEl.textContent = String(totals.onchainSettled);
      totalVolumeEl.textContent = `$${fmtAmount(totals.volumeUsdc)}`;
      allActivityLink.href = res.explorerUrl || PLATFORM_EXPLORER_URL;

      if (items.length === 0) {
        activityList.innerHTML =
          '<div class="empty">Tap a paragraph on any Mtrly article to see your first onchain tick here.</div>';
        return;
      }

      activityList.innerHTML = "";
      items.forEach((p) => {
        const row = document.createElement("div");
        row.className = "tick";

        const left = document.createElement("span");
        left.className = "muted";
        left.textContent = timeAgo(p.createdAt);

        const title = document.createElement("span");
        title.className = "title";
        title.textContent = p.title || (p.toName ? `tip → ${p.toName}` : "—");
        title.title = p.title || "";

        const right = document.createElement("span");
        const amt = document.createElement("span");
        amt.className = "amount";
        amt.textContent = `$${fmtAmount(p.amountUsdc)}`;
        right.appendChild(amt);

        if (p.explorerUrl) {
          const a = document.createElement("a");
          a.href = p.explorerUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = p.onchainTxHash ? shortHash(p.onchainTxHash) : "batch";
          a.title = p.onchainTxHash || p.nanopaymentTxId || "Onchain proof on arcscan";
          right.appendChild(a);
        } else {
          const pending = document.createElement("span");
          pending.className = "pending";
          pending.textContent = "batching…";
          right.appendChild(pending);
        }

        row.append(left, title, right);
        activityList.appendChild(row);
      });
    },
  );
}

chrome.runtime.sendMessage({ type: "me" }, (res) => {
  if (res && res.user) {
    setLoggedIn(res.user);
  } else {
    setLoggedOut();
  }
});

loginBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "me" }, (res) => {
    const target =
      res && res.user ? `${API_BASE}/balance` : `${API_BASE}/auth/login?ext=1`;
    chrome.tabs.create({ url: target });
  });
});

topupBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/balance` });
});

explorerBtn.addEventListener("click", () => {
  const url = explorerBtn.dataset.url || PLATFORM_EXPLORER_URL;
  chrome.tabs.create({ url });
});

walletLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: walletLink.href });
});
allActivityLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: allActivityLink.href });
});
