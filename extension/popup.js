const API_BASE = "https://circlearc-59513674.slonix.dev";

const authStatusEl = document.getElementById("auth-status");
const balanceEl = document.getElementById("balance");
const loginBtn = document.getElementById("login-btn");
const topupBtn = document.getElementById("topup-btn");

chrome.runtime.sendMessage({ type: "getToken" }, (res) => {
  if (res && res.token) {
    authStatusEl.textContent = "Logged in";
    loginBtn.textContent = "Log out";
  }
});

loginBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/auth/login?ext=1` });
});

topupBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/balance` });
});
