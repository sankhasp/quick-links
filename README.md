# Quick Links

![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

**Select text containing URLs → open them all as new tabs in one shot.**

Quick Links is a Chrome extension that finds every URL in your text selection and opens them simultaneously — whether they're plain-text links, rich HTML anchors, or a mix of both. Trigger it via right-click or a configurable hotkey.

---

## Storefront Description
Ever see a list of links and you wish you could open them all at once? No one built something like this and I need it all the time.

Trigger by selecting and then pressing the hotkey (Ctrl+Q or Cmd+Q) or selecting the option from the context menu.

* If the selection is a plain text we will extract and open all links in its own tab.
* If the selection is a HTML we will find links with the same destination like the first link and open all the links in its own tab.

Settings:
* Select the domains you want to use the extension on. At least one domain must be added before the extension will activate.
* Change the hotkey to something you prefer.
* Choose if you want to confirm before autoclosing parent window.



## Features

- **Right-click context menu** — "Open all URLs in new tabs" appears on any text selection containing URLs
- **Keyboard hotkey** — configurable shortcut (default: `Ctrl+Q`), fires from any page
- **HTML anchor mode** — when your selection contains anchor tags, finds all similar-path links on the page and opens those
- **Plain-text URL extraction** — extracts `http://` / `https://` URLs from raw text, stripping surrounding punctuation cleanly
- **Domain allowlist** — restrict the extension to specific sites; leave empty to allow all
- **Add current site** — one-click button in the popup to add/remove the active tab's domain
- **Tab tracking** — when all opened child tabs are closed, optionally brings you back and asks to close the parent tab too
- **Confirm-before-close toggle** — control whether you're prompted before the parent tab closes

---

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `quick-links` folder
6. The extension icon appears in your toolbar

---

## Usage

### Opening URLs

1. **Select** any text on a page that contains URLs (or select anchor links in a list)
2. **Right-click** → choose **"Open all URLs in new tabs"**
   — or press your configured hotkey (default `Ctrl+Q`)

### Two opening modes

| Mode | When it activates | What it does |
|------|------------------|--------------|
| **HTML mode** | Selection contains `<a href>` tags | Finds all anchors with a similar URL path pattern and opens those |
| **Text mode** | Selection is plain text | Extracts every `https?://` URL via regex and opens them |

### Settings popup

Click the extension icon in the toolbar to open settings.

---

## Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| **Allowed Domains** | Hostnames where the extension is active. At least one domain must be added before the extension will trigger anywhere. Type a domain and press `Enter` or `,` to add. | *(empty — disabled everywhere)* |
| **Current site shortcut** | Pill below the chip input — one click to add or remove the active tab's domain | — |
| **Trigger Hotkey** | Click the field and press a key combination to record it. Click `×` to clear. | `Ctrl+Q` |
| **Confirm Before Close** | When all child tabs are closed, show a confirmation dialog before closing the parent tab | Enabled |

---

## Architecture

### File overview

| File | Role |
|------|------|
| `manifest.json` | Chrome MV3 extension manifest — permissions, background worker, content scripts |
| `background.js` | Service worker — context menu, URL extraction, tab tracking, domain guard, hotkey handler |
| `content.js` | Injected into every page — reports selection changes, listens for hotkey |
| `popup.html` | Settings UI markup and styles |
| `popup.js` | Settings UI logic — chip input, hotkey recorder, toggle, current-site suggestion |
| `icons/` | Extension icons — PNG files at 16, 32, 48, and 128 px |

### How URL opening works

**HTML mode** (selection contains `<a href>` tags):
1. The first anchor's `href` is used as a reference URL
2. All other anchors in the selection are checked for a matching hostname + path prefix
3. Matched URLs are opened as tabs (first tab gets focus)
4. No parent tracking — these are explicit anchor navigations

**Text mode** (plain text selection):
1. `extractUrls()` runs a regex over the selection text
2. Trailing punctuation (`.,:;)]\>'"`  ) is stripped from each match
3. Duplicate URLs are removed
4. All URLs are opened; the first tab gets focus
5. Child tab IDs are stored in `chrome.storage.session` keyed by parent tab ID

### Tab tracking

After opening tabs in **text mode**, Quick Links tracks which child tabs belong to which parent. When every child tab is closed:
- The parent tab is brought into focus
- If **Confirm Before Close** is on, a native `confirm()` dialog asks whether to close the parent too
- The tracking entry is cleaned up from session storage

### Storage schema

```
chrome.storage.sync
  allowedDomains: string[]       // e.g. ["github.com", "example.com"]
  hotkey: { key, ctrl, shift, alt, meta } | null
  confirmBeforeClose: boolean

chrome.storage.session
  tracking: { [parentTabId: string]: number[] }   // child tab IDs
```

---

## Development

No build step required — the extension runs directly from source.

**Reload after changes:**
1. Edit any source file
2. Go to `chrome://extensions`
3. Click the refresh icon on the Quick Links card
4. Reload any open tabs to pick up `content.js` changes

**Run tests:**

```bash
npm install
npm test
```

Tests use [Vitest](https://vitest.dev/) with jsdom. See `tests/` for coverage of URL extraction, domain matching, hotkey logic, and domain chip management.

---

## License

MIT
