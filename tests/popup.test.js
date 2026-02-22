import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Pure functions from popup.js (inlined for testing without ESM exports)
// ---------------------------------------------------------------------------

function hotkeyToString(hk) {
  if (!hk) return ''
  const parts = []
  if (hk.ctrl) parts.push('Ctrl')
  if (hk.alt) parts.push('Alt')
  if (hk.shift) parts.push('Shift')
  if (hk.meta) parts.push('Meta')
  if (hk.key) parts.push(hk.key.toUpperCase())
  return parts.join(' + ')
}

// Pure version of addDomain logic — returns new array (doesn't mutate)
function addDomainPure(value, domains) {
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!domain || domains.includes(domain)) return domains
  return [...domains, domain]
}

// ---------------------------------------------------------------------------
// hotkeyToString
// ---------------------------------------------------------------------------

describe('hotkeyToString', () => {
  it('returns empty string for null', () => {
    expect(hotkeyToString(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(hotkeyToString(undefined)).toBe('')
  })

  it('formats Ctrl+Q (default hotkey)', () => {
    expect(hotkeyToString({ key: 'q', ctrl: true, shift: false, alt: false, meta: false })).toBe('Ctrl + Q')
  })

  it('formats Ctrl+Shift+K', () => {
    expect(hotkeyToString({ key: 'k', ctrl: true, shift: true, alt: false, meta: false })).toBe('Ctrl + Shift + K')
  })

  it('formats Alt+F', () => {
    expect(hotkeyToString({ key: 'f', ctrl: false, shift: false, alt: true, meta: false })).toBe('Alt + F')
  })

  it('formats Meta+S', () => {
    expect(hotkeyToString({ key: 's', ctrl: false, shift: false, alt: false, meta: true })).toBe('Meta + S')
  })

  it('formats key-only (no modifiers), uppercases it', () => {
    expect(hotkeyToString({ key: 'a', ctrl: false, shift: false, alt: false, meta: false })).toBe('A')
  })

  it('formats Ctrl+Alt+Shift+X (all non-meta modifiers)', () => {
    expect(hotkeyToString({ key: 'x', ctrl: true, shift: true, alt: true, meta: false })).toBe('Ctrl + Alt + Shift + X')
  })

  it('formats all modifiers including meta', () => {
    const result = hotkeyToString({ key: 'z', ctrl: true, shift: true, alt: true, meta: true })
    expect(result).toBe('Ctrl + Alt + Shift + Meta + Z')
  })

  it('returns empty string when key is empty', () => {
    expect(hotkeyToString({ key: '', ctrl: false, shift: false, alt: false, meta: false })).toBe('')
  })
})

// ---------------------------------------------------------------------------
// addDomain (pure logic)
// ---------------------------------------------------------------------------

describe('addDomainPure', () => {
  it('adds a plain domain to an empty list', () => {
    expect(addDomainPure('github.com', [])).toEqual(['github.com'])
  })

  it('strips https:// prefix', () => {
    expect(addDomainPure('https://github.com', [])).toEqual(['github.com'])
  })

  it('strips http:// prefix', () => {
    expect(addDomainPure('http://github.com', [])).toEqual(['github.com'])
  })

  it('strips path after domain', () => {
    expect(addDomainPure('https://github.com/owner/repo/issues', [])).toEqual(['github.com'])
  })

  it('lowercases the domain', () => {
    expect(addDomainPure('GITHUB.COM', [])).toEqual(['github.com'])
  })

  it('trims leading and trailing whitespace', () => {
    expect(addDomainPure('  github.com  ', [])).toEqual(['github.com'])
  })

  it('returns the same array reference for empty string (no-op)', () => {
    const domains = ['existing.com']
    expect(addDomainPure('', domains)).toBe(domains)
  })

  it('returns the same array reference for whitespace-only string (no-op)', () => {
    const domains = ['existing.com']
    expect(addDomainPure('   ', domains)).toBe(domains)
  })

  it('returns the same array reference for a duplicate domain (no-op)', () => {
    const domains = ['github.com']
    expect(addDomainPure('github.com', domains)).toBe(domains)
  })

  it('returns the same array reference for https:// duplicate', () => {
    const domains = ['github.com']
    expect(addDomainPure('https://github.com', domains)).toBe(domains)
  })

  it('appends new domain to existing list without mutating original', () => {
    const original = ['github.com']
    const result = addDomainPure('google.com', original)
    expect(result).toEqual(['github.com', 'google.com'])
    expect(original).toEqual(['github.com']) // unchanged
  })

  it('handles subdomain input correctly (keeps full subdomain)', () => {
    expect(addDomainPure('api.github.com', [])).toEqual(['api.github.com'])
  })
})
