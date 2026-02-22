import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Pure functions from content.js (inlined for testing without ESM exports)
// ---------------------------------------------------------------------------

function matchesHotkey(e, hotkey) {
  if (!hotkey) return false
  return (
    e.key.toLowerCase() === hotkey.key.toLowerCase() &&
    e.ctrlKey === hotkey.ctrl &&
    e.shiftKey === hotkey.shift &&
    e.altKey === hotkey.alt &&
    e.metaKey === hotkey.meta
  )
}

// ---------------------------------------------------------------------------
// matchesHotkey
// ---------------------------------------------------------------------------

describe('matchesHotkey', () => {
  const makeEvent = (key, ctrl = false, shift = false, alt = false, meta = false) => ({
    key,
    ctrlKey: ctrl,
    shiftKey: shift,
    altKey: alt,
    metaKey: meta,
  })

  it('returns false when hotkey is null', () => {
    expect(matchesHotkey(makeEvent('q', true), null)).toBe(false)
  })

  it('returns false when hotkey is undefined', () => {
    expect(matchesHotkey(makeEvent('q', true), undefined)).toBe(false)
  })

  it('returns true for exact Ctrl+Q match', () => {
    const e = makeEvent('q', true)
    const hk = { key: 'q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(true)
  })

  it('is case-insensitive for the key (event uppercase, hotkey lowercase)', () => {
    const e = makeEvent('Q', true)
    const hk = { key: 'q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(true)
  })

  it('is case-insensitive for the key (event lowercase, hotkey uppercase)', () => {
    const e = makeEvent('q', true)
    const hk = { key: 'Q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(true)
  })

  it('returns false when key does not match', () => {
    const e = makeEvent('w', true)
    const hk = { key: 'q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(false)
  })

  it('returns false when ctrl state mismatches (expected true, got false)', () => {
    const e = makeEvent('q', false)
    const hk = { key: 'q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(false)
  })

  it('returns false when ctrl state mismatches (expected false, got true)', () => {
    const e = makeEvent('q', true)
    const hk = { key: 'q', ctrl: false, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(false)
  })

  it('returns false when shift state mismatches', () => {
    const e = makeEvent('q', true, true)
    const hk = { key: 'q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(false)
  })

  it('returns false when alt state mismatches', () => {
    const e = makeEvent('q', true, false, true)
    const hk = { key: 'q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(false)
  })

  it('returns false when meta state mismatches', () => {
    const e = makeEvent('q', true, false, false, true)
    const hk = { key: 'q', ctrl: true, shift: false, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(false)
  })

  it('matches Meta+K combination', () => {
    const e = makeEvent('k', false, false, false, true)
    const hk = { key: 'k', ctrl: false, shift: false, alt: false, meta: true }
    expect(matchesHotkey(e, hk)).toBe(true)
  })

  it('matches Ctrl+Shift+K combination', () => {
    const e = makeEvent('k', true, true, false, false)
    const hk = { key: 'k', ctrl: true, shift: true, alt: false, meta: false }
    expect(matchesHotkey(e, hk)).toBe(true)
  })

  it('matches Ctrl+Alt+Shift combination', () => {
    const e = makeEvent('x', true, true, true, false)
    const hk = { key: 'x', ctrl: true, shift: true, alt: true, meta: false }
    expect(matchesHotkey(e, hk)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Selection content detection logic (DOM-based, uses jsdom)
// ---------------------------------------------------------------------------

describe('selectionHasContent URL detection', () => {
  const hasUrl = (text) => /https?:\/\//.test(text)

  it('detects https:// in text', () => {
    expect(hasUrl('visit https://example.com')).toBe(true)
  })

  it('detects http:// in text', () => {
    expect(hasUrl('visit http://example.com')).toBe(true)
  })

  it('returns false for plain text without URL', () => {
    expect(hasUrl('just some text here')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(hasUrl('')).toBe(false)
  })

  it('returns false for ftp:// (not supported)', () => {
    expect(hasUrl('ftp://example.com')).toBe(false)
  })
})

describe('selectionHasContent anchor detection', () => {
  const hasAnchor = (html) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return !!div.querySelector('a[href]')
  }

  it('detects anchor tag with href', () => {
    expect(hasAnchor('<a href="https://example.com">link</a>')).toBe(true)
  })

  it('does not detect anchor tag without href', () => {
    expect(hasAnchor('<a name="section">anchor</a>')).toBe(false)
  })

  it('returns false for plain paragraph', () => {
    expect(hasAnchor('<p>no links here</p>')).toBe(false)
  })

  it('returns false for empty div', () => {
    expect(hasAnchor('<div></div>')).toBe(false)
  })

  it('detects nested anchor inside other elements', () => {
    expect(hasAnchor('<ul><li><a href="https://x.com">link</a></li></ul>')).toBe(true)
  })

  it('detects multiple anchors (only checks presence)', () => {
    expect(hasAnchor('<a href="https://a.com">a</a><a href="https://b.com">b</a>')).toBe(true)
  })

  it('detects anchor with relative href', () => {
    expect(hasAnchor('<a href="/relative/path">link</a>')).toBe(true)
  })
})
