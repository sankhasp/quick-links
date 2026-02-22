const MENU_ID = "quick-links-open-urls";

// ---------------------------------------------------------------------------
// Install: create context menu + set default settings
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Open all URLs in new tabs",
    contexts: ["selection"],
  });

  // Set default settings only if not already stored
  chrome.storage.sync.get(["allowedDomains", "hotkey", "confirmBeforeClose"], (data) => {
    const defaults = {};
    if (!("allowedDomains" in data)) defaults.allowedDomains = [];
    if (!("hotkey" in data)) defaults.hotkey = { key: "q", ctrl: true, shift: false, alt: false, meta: false };
    if (!("confirmBeforeClose" in data)) defaults.confirmBeforeClose = true;
    if (Object.keys(defaults).length > 0) chrome.storage.sync.set(defaults);
  });

  // Inject content.js into already-open tabs — Chrome does NOT retroactively
  // inject declarative content_scripts into tabs that were open at install time.
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url || /^(chrome|about|data|javascript):/.test(tab.url)) continue;
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] })
      .catch(() => {}); // silently skip non-injectable tabs (PDFs, chrome://, etc.)
  }
});

// ---------------------------------------------------------------------------
// Settings helper
// ---------------------------------------------------------------------------

async function getSettings() {
  const data = await chrome.storage.sync.get(["allowedDomains", "hotkey", "confirmBeforeClose"]);
  return {
    allowedDomains: data.allowedDomains ?? [],
    hotkey: data.hotkey ?? null,
    confirmBeforeClose: "confirmBeforeClose" in data ? data.confirmBeforeClose : true,
  };
}

// ---------------------------------------------------------------------------
// Domain guard
// ---------------------------------------------------------------------------

function isDomainAllowed(url, allowedDomains) {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  return allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith("." + domain)
  );
}

// ---------------------------------------------------------------------------
// Tab tracking (TEXT mode only)
//
// Persisted in chrome.storage.session so it survives service worker restarts.
// Shape: { [parentTabId: string]: number[] }
// ---------------------------------------------------------------------------

async function getTracking() {
  const { tracking } = await chrome.storage.session.get("tracking");
  return tracking ?? {};
}

async function trackBatch(parentTabId, childTabIds) {
  const tracking = await getTracking();
  tracking[String(parentTabId)] = childTabIds;
  await chrome.storage.session.set({ tracking });
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const tracking = await getTracking();

  // If the parent itself is closed, clean up its entry — nothing left to do.
  if (tracking[String(tabId)]) {
    delete tracking[String(tabId)];
    await chrome.storage.session.set({ tracking });
    return;
  }

  // Check whether this is a tracked child tab.
  for (const [parentId, children] of Object.entries(tracking)) {
    if (!children.includes(tabId)) continue;

    const remaining = children.filter((id) => id !== tabId);

    if (remaining.length === 0) {
      // Last child closed — optionally ask via native confirm in the parent tab.
      delete tracking[parentId];
      await chrome.storage.session.set({ tracking });
      const numericParentId = parseInt(parentId, 10);
      try {
        const { confirmBeforeClose } = await getSettings();
        await chrome.tabs.update(numericParentId, { active: true });

        if (confirmBeforeClose) {
          const [{ result: confirmed }] = await chrome.scripting.executeScript({
            target: { tabId: numericParentId },
            func: () => window.confirm("All opened tabs are closed. Close this tab too?"),
          });
          if (confirmed) chrome.tabs.remove(numericParentId);
        } else {
          chrome.tabs.remove(numericParentId);
        }
      } catch (err) {
        console.error("[Quick Links] confirm failed:", err);
      }
    } else {
      tracking[parentId] = remaining;
      await chrome.storage.session.set({ tracking });
    }
    return;
  }
});

// ---------------------------------------------------------------------------
// Auto-detect and open URLs
//
// Inspects the live selection in the page:
//   - If anchor tags with hrefs are found → open those (no parent tracking)
//   - Otherwise → extract URLs from plain text and track the parent tab
// ---------------------------------------------------------------------------

async function autoOpenUrls(tabId, parentTabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return { mode: "none" };

      const div = document.createElement("div");
      div.appendChild(sel.getRangeAt(0).cloneContents());

      const anchorsInSelection = [...div.querySelectorAll("a[href]")];

      if (anchorsInSelection.length > 0) {
        // HTML mode: use the first anchor to find all similar anchors on the page
        const rawHref = anchorsInSelection[0].getAttribute("href");
        const refHref = new URL(rawHref, location.href).href;

        function getPathPrefix(href) {
          let url;
          try { url = new URL(href); } catch (_) { return null; }
          const segments = url.pathname.split("/").filter(Boolean);
          if (segments.length === 0) return null;
          if (segments.length === 1) return segments[0];
          return segments.slice(0, -1).join("/");
        }

        function isSimilarSlug(a, b) {
          const ap = getPathPrefix(a);
          const bp = getPathPrefix(b);
          if (!ap || !bp || ap !== bp) return false;
          try { return new URL(a).hostname === new URL(b).hostname; }
          catch (_) { return false; }
        }

        const urls = [...div.querySelectorAll("a[href]")]
          .filter((a) => isSimilarSlug(refHref, a.href))
          .map((a) => a.href)
          .filter((u, i, arr) => u.startsWith("http") && arr.indexOf(u) === i);

        return { mode: "html", urls };
      }

      return { mode: "text", text: sel.toString() };
    },
  });

  const result = results?.[0]?.result ?? { mode: "none" };

  if (result.mode === "html") {
    result.urls.forEach((url, i) => chrome.tabs.create({ url, active: i === 0 }));
    return;
  }

  if (result.mode === "text" && result.text) {
    const urls = extractUrls(result.text);
    if (urls.length === 0) {
      console.log("[Quick Links] No URLs found in selection.");
      return;
    }
    const childIds = await Promise.all(
      urls.map((url, i) => chrome.tabs.create({ url, active: i === 0 }).then((t) => t.id))
    );
    await trackBatch(parentTabId, childIds);
  }
}

// ---------------------------------------------------------------------------
// Dynamic context menu enable/disable
//
// Disabled when: domain is not allowed OR selection has no URLs/links.
// Chrome has no native per-domain or per-selection filtering, so we manage
// the enabled state ourselves, keyed by tabId.
// ---------------------------------------------------------------------------

// Per-tab cache: does the active selection contain any URLs or anchor tags?
const tabContentState = {}; // { [tabId: number]: boolean }

async function syncMenuEnabled(tabId, url) {
  if (!url || /^(chrome|about|data|javascript):/.test(url)) return;
  const { allowedDomains } = await getSettings();
  const domainOk = isDomainAllowed(url, allowedDomains);
  const hasContent = tabContentState[tabId] ?? false;
  chrome.contextMenus.update(MENU_ID, { enabled: domainOk && hasContent });
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    syncMenuEnabled(tabId, tab.url);
  } catch {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Navigation resets the selection state for that tab
  if (changeInfo.url) {
    delete tabContentState[tabId];
    syncMenuEnabled(tabId, changeInfo.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabContentState[tabId];
});

// ---------------------------------------------------------------------------
// Context menu handler
// ---------------------------------------------------------------------------

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;

  const { allowedDomains } = await getSettings();
  if (!isDomainAllowed(tab.url, allowedDomains)) {
    console.log("[Quick Links] Domain not allowed:", tab.url);
    return;
  }

  autoOpenUrls(tab.id, tab.id);
});

// ---------------------------------------------------------------------------
// Content script message handler (hotkey trigger)
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (message.action === "selectionChange") {
    tabContentState[tabId] = message.hasContent;
    syncMenuEnabled(tabId, sender.tab.url);
    return;
  }

  if (message.action === "trigger") {
    getSettings().then(({ allowedDomains }) => {
      if (!isDomainAllowed(sender.tab.url, allowedDomains)) {
        console.log("[Quick Links] Domain not allowed:", sender.tab.url);
        return;
      }
      autoOpenUrls(tabId, tabId);
    });
  }
});

// ---------------------------------------------------------------------------
// URL extraction (plain text fallback)
// ---------------------------------------------------------------------------

/**
 * Extracts all http/https URLs from a string.
 * Handles URLs that may be surrounded by whitespace, quotes, angle brackets,
 * parentheses, or commas — common in copied rich text.
 */
function extractUrls(text) {
  const URL_REGEX =
    /https?:\/\/(?:[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%])+/g;

  const rawMatches = text.match(URL_REGEX) ?? [];

  return rawMatches
    .map((url) => url.replace(/[.,;)\]>'"\s]+$/, "")) // strip trailing punctuation
    .filter((url, index, arr) => arr.indexOf(url) === index); // deduplicate
}
