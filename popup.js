// ---------------------------------------------------------------------------
// Popup script — loads/saves settings in chrome.storage.sync
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  allowedDomains: [],
  hotkey: { key: "q", ctrl: true, shift: false, alt: false, meta: false },
  confirmBeforeClose: true,
};

// ── State ──────────────────────────────────────────────────────────────────
let domains = [];
let hotkeyRecording = false;

// ── Elements ───────────────────────────────────────────────────────────────
const chipsWrapper = document.getElementById("chips-wrapper");
const domainInput = document.getElementById("domain-input");
const hotkeyInput = document.getElementById("hotkey-input");
const hotkeyClear = document.getElementById("hotkey-clear");
const confirmToggle = document.getElementById("confirm-toggle");

// ── Helpers ────────────────────────────────────────────────────────────────

function hotkeyToString(hk) {
  if (!hk) return "";
  const parts = [];
  if (hk.ctrl) parts.push("Ctrl");
  if (hk.alt) parts.push("Alt");
  if (hk.shift) parts.push("Shift");
  if (hk.meta) parts.push("Meta");
  if (hk.key) parts.push(hk.key.toUpperCase());
  return parts.join(" + ");
}

// ── Domains ────────────────────────────────────────────────────────────────

function renderChips() {
  // Remove all existing chips (keep the input)
  chipsWrapper.querySelectorAll(".chip").forEach((el) => el.remove());

  domains.forEach((domain, idx) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = domain;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Remove ${domain}`);
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    btn.addEventListener("click", () => removeDomain(idx));

    chip.appendChild(btn);
    chipsWrapper.insertBefore(chip, domainInput);
  });

  updateCurrentSiteUI();
}

function addDomain(value) {
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!domain || domains.includes(domain)) return;
  domains.push(domain);
  renderChips();
  saveDomains();
}

function removeDomain(idx) {
  domains.splice(idx, 1);
  renderChips();
  saveDomains();
}

function saveDomains() {
  chrome.storage.sync.set({ allowedDomains: domains });
}

// ── Current site suggestion ────────────────────────────────────────────────

let currentSiteDomain = null;

const currentSiteRow = document.getElementById("current-site-row");
const currentSiteAdd = document.getElementById("current-site-add");
const currentSiteDomainEl = document.getElementById("current-site-domain");
const currentSiteAddedEl = document.getElementById("current-site-added");
const currentSiteAddedLabel = document.getElementById("current-site-added-label");
const currentSiteRemove = document.getElementById("current-site-remove");

function updateCurrentSiteUI() {
  if (!currentSiteDomain) {
    currentSiteRow.classList.remove("visible");
    return;
  }
  currentSiteRow.classList.add("visible");
  const isAdded = domains.includes(currentSiteDomain);
  if (isAdded) {
    currentSiteAdd.style.display = "none";
    currentSiteAddedEl.style.display = "inline-flex";
    currentSiteAddedLabel.textContent = currentSiteDomain;
  } else {
    currentSiteAdd.style.display = "inline-flex";
    currentSiteAddedEl.style.display = "none";
    currentSiteDomainEl.textContent = currentSiteDomain;
  }
}

currentSiteAdd.addEventListener("click", () => {
  if (currentSiteDomain) {
    addDomain(currentSiteDomain);
    updateCurrentSiteUI();
  }
});

currentSiteRemove.addEventListener("click", () => {
  if (currentSiteDomain) {
    const idx = domains.indexOf(currentSiteDomain);
    if (idx !== -1) {
      removeDomain(idx);
      updateCurrentSiteUI();
    }
  }
});

// Load current tab domain on popup open
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url) return;
  let hostname;
  try { hostname = new URL(tab.url).hostname; } catch { return; }
  if (!hostname || /^(chrome|about|data|javascript|moz-extension|chrome-extension)/.test(tab.url)) return;
  currentSiteDomain = hostname;
  updateCurrentSiteUI();
});

// Click on wrapper focuses the input
chipsWrapper.addEventListener("click", (e) => {
  if (e.target === chipsWrapper) domainInput.focus();
});

domainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addDomain(domainInput.value);
    domainInput.value = "";
  } else if (e.key === "Backspace" && domainInput.value === "" && domains.length > 0) {
    removeDomain(domains.length - 1);
  }
});

domainInput.addEventListener("blur", () => {
  if (domainInput.value.trim()) {
    addDomain(domainInput.value);
    domainInput.value = "";
  }
});

// ── Hotkey ─────────────────────────────────────────────────────────────────

hotkeyInput.addEventListener("focus", () => {
  hotkeyRecording = true;
  hotkeyInput.classList.add("recording");
  hotkeyInput.value = "";
  hotkeyInput.placeholder = "Press a key combo…";
});

hotkeyInput.addEventListener("blur", () => {
  hotkeyRecording = false;
  hotkeyInput.classList.remove("recording");
  hotkeyInput.placeholder = "Click to record shortcut";
});

hotkeyInput.addEventListener("keydown", (e) => {
  if (!hotkeyRecording) return;
  e.preventDefault();
  e.stopPropagation();

  // Ignore bare modifier presses
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

  const hk = {
    key: e.key.toLowerCase(),
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
  };

  hotkeyInput.value = hotkeyToString(hk);
  hotkeyInput.blur();
  chrome.storage.sync.set({ hotkey: hk });
});

hotkeyClear.addEventListener("click", () => {
  hotkeyInput.value = "";
  chrome.storage.sync.set({ hotkey: null });
});

// ── Confirm toggle ─────────────────────────────────────────────────────────

confirmToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ confirmBeforeClose: confirmToggle.checked });
});

// ── Init ───────────────────────────────────────────────────────────────────

chrome.storage.sync.get(["allowedDomains", "hotkey", "confirmBeforeClose"], (data) => {
  domains = data.allowedDomains ?? DEFAULT_SETTINGS.allowedDomains;
  renderChips();

  const hk = "hotkey" in data ? data.hotkey : DEFAULT_SETTINGS.hotkey;
  hotkeyInput.value = hotkeyToString(hk);

  const confirm = "confirmBeforeClose" in data ? data.confirmBeforeClose : DEFAULT_SETTINGS.confirmBeforeClose;
  confirmToggle.checked = confirm;
});
