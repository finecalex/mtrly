const API_BASE = "https://circlearc-59513674.slonix.dev";

const authStatusEl = document.getElementById("auth-status");
const balanceEl = document.getElementById("balance");
const loginBtn = document.getElementById("login-btn");
const topupBtn = document.getElementById("topup-btn");

function setLoggedIn(user) {
  authStatusEl.textContent = user.displayName || user.email;
  balanceEl.textContent = `$${Number(user.balance ?? 0).toFixed(4)}`;
  loginBtn.textContent = "Open dashboard";
}

function setLoggedOut() {
  authStatusEl.textContent = "Logged out";
  balanceEl.textContent = "—";
  loginBtn.textContent = "Log in";
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
    const target = res && res.user
      ? `${API_BASE}/balance`
      : `${API_BASE}/auth/login?ext=1`;
    chrome.tabs.create({ url: target });
  });
});

topupBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/balance` });
});
