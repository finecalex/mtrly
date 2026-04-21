(function () {
  const url = window.location.href;

  chrome.runtime.sendMessage({ type: "match", url }, (res) => {
    if (!res || !res.match) return;
    injectSidePanel(res);
  });

  function injectSidePanel(match) {
    if (document.getElementById("mtrly-panel")) return;
    const panel = document.createElement("div");
    panel.id = "mtrly-panel";
    panel.innerHTML = `
      <div class="mtrly-panel-header">
        <span class="mtrly-logo">mtrly</span>
        <span class="mtrly-status">•</span>
      </div>
      <div class="mtrly-row"><span>Balance</span><b id="mtrly-balance">—</b></div>
      <div class="mtrly-row"><span>Spent</span><b id="mtrly-spent">$0.00</b></div>
      <div class="mtrly-row"><span>Rate</span><b>$${match.price}/${match.unit}</b></div>
      <div class="mtrly-row"><span>Kind</span><b>${match.kind}</b></div>
    `;
    document.documentElement.appendChild(panel);
  }
})();
