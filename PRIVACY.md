# Privacy Policy — Quick Links

**Last updated: February 22, 2026**

## Overview

Quick Links is a browser extension that opens URLs found in your text selection as new tabs. This policy explains what data the extension accesses and how it is used.

## Data collected

Quick Links does not collect, transmit, or share any personal data. All information stays on your device.

### Settings (stored locally)

The extension stores the following preferences in your browser's built-in sync storage (`chrome.storage.sync`):

| Setting | Purpose |
|---|---|
| Allowed domains | The list of websites where the extension is enabled |
| Keyboard shortcut | Your custom hotkey for triggering the extension |
| Confirm before close | Whether to show a confirmation prompt when closing the source tab |

These values are synced across your own Chrome profile by the browser. They are never sent to any third-party server.

### Temporary tab tracking (session only)

When you open multiple URLs at once, the extension briefly tracks which tabs it opened in order to offer a "close source tab" prompt when you finish. This tracking is held in `chrome.storage.session` — it exists only for the current browser session and is cleared automatically when the tabs close.

## Data the extension accesses but does not store

- **Your text selection** — read at the moment you trigger the extension to extract URLs. It is never stored or transmitted.
- **The active tab's URL** — read when you open the settings popup to show a one-click "add current site" suggestion. It is never stored or transmitted beyond that interaction.

## Data not collected

- No browsing history
- No page content beyond the user-selected text at trigger time
- No cookies or credentials
- No analytics or usage tracking
- No crash reporting
- No advertising identifiers

## Third-party services

Quick Links does not use any third-party services, APIs, or analytics platforms.

## Changes to this policy

If this policy changes, the updated version will be published at the same URL with a revised date at the top.

## Contact

If you have questions about this policy, please open an issue at the extension's source repository.
