// ---------------------------------------------------------------------------
// Content script — listens for the user-configured hotkey and forwards it to
// the background service worker via a runtime message.
// ---------------------------------------------------------------------------

let hotkey = null;

function loadHotkey() {
  chrome.storage.sync.get("hotkey", ({ hotkey: hk }) => {
    hotkey = hk ?? null;
  });
}

// Initial load
loadHotkey();

// Re-sync whenever the setting changes (e.g. user updates in popup)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && "hotkey" in changes) {
    hotkey = changes.hotkey.newValue ?? null;
  }
});

// ---------------------------------------------------------------------------
// Selection → notify background so it can enable/disable the context menu
// ---------------------------------------------------------------------------

function selectionHasContent() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return false;

  const div = document.createElement("div");
  div.appendChild(sel.getRangeAt(0).cloneContents());

  if (div.querySelector("a[href]")) return true;
  return /https?:\/\//.test(sel.toString());
}

function reportSelection() {
  chrome.runtime.sendMessage({ action: "selectionChange", hasContent: selectionHasContent() });
}

// mouseup covers click-drag selections
document.addEventListener("mouseup", reportSelection);

// keyup catches shift-arrow / shift-end / etc.
document.addEventListener("keyup", (e) => {
  if (e.shiftKey || e.key === "Escape") reportSelection();
});

// ---------------------------------------------------------------------------
// Hotkey
// ---------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
  if (!hotkey) return;

  const keyMatch = e.key.toLowerCase() === hotkey.key.toLowerCase();
  const ctrlMatch = e.ctrlKey === hotkey.ctrl;
  const shiftMatch = e.shiftKey === hotkey.shift;
  const altMatch = e.altKey === hotkey.alt;
  const metaMatch = e.metaKey === hotkey.meta;

  if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: "trigger" });
  }
}, true); // capture phase — fires before page handlers
