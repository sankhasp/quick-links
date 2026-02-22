import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Pure functions from background.js (inlined for testing without ESM exports)
// ---------------------------------------------------------------------------

function isDomainAllowed(url, allowedDomains) {
  if (!allowedDomains || allowedDomains.length === 0) return true
  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    return false
  }
  return allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith('.' + domain)
  )
}

function extractUrls(text) {
  const URL_REGEX = /https?:\/\/(?:[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%])+/g
  const rawMatches = text.match(URL_REGEX) ?? []
  return rawMatches
    .map((url) => url.replace(/[.,;)\]>'"\s]+$/, ''))
    .filter((url, index, arr) => arr.indexOf(url) === index)
}

// ---------------------------------------------------------------------------
// isDomainAllowed
// ---------------------------------------------------------------------------

describe('isDomainAllowed', () => {
  it('allows any URL when allowedDomains is empty array', () => {
    expect(isDomainAllowed('https://anything.com/path', [])).toBe(true)
  })

  it('allows any URL when allowedDomains is null', () => {
    expect(isDomainAllowed('https://anything.com', null)).toBe(true)
  })

  it('allows any URL when allowedDomains is undefined', () => {
    expect(isDomainAllowed('https://anything.com', undefined)).toBe(true)
  })

  it('allows exact domain match', () => {
    expect(isDomainAllowed('https://github.com/owner/repo', ['github.com'])).toBe(true)
  })

  it('allows subdomain when parent domain is in list', () => {
    expect(isDomainAllowed('https://api.github.com/v3/repos', ['github.com'])).toBe(true)
  })

  it('allows deep subdomain', () => {
    expect(isDomainAllowed('https://deep.sub.github.com/path', ['github.com'])).toBe(true)
  })

  it('blocks domain not in list', () => {
    expect(isDomainAllowed('https://evil.com/path', ['github.com'])).toBe(false)
  })

  it('does not allow prefix-match without dot boundary (notgithub.com vs github.com)', () => {
    expect(isDomainAllowed('https://notgithub.com', ['github.com'])).toBe(false)
  })

  it('returns false for an invalid/unparseable URL', () => {
    expect(isDomainAllowed('not-a-url', ['github.com'])).toBe(false)
  })

  it('returns false for empty string URL', () => {
    expect(isDomainAllowed('', ['github.com'])).toBe(false)
  })

  it('allows when domain appears anywhere in a multi-domain list', () => {
    expect(isDomainAllowed('https://example.com', ['github.com', 'example.com', 'google.com'])).toBe(true)
  })

  it('allows URL with query params and fragment', () => {
    expect(isDomainAllowed('https://docs.github.com/en/rest?foo=bar#section', ['github.com'])).toBe(true)
  })

  it('handles http:// URLs', () => {
    expect(isDomainAllowed('http://github.com/foo', ['github.com'])).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// extractUrls
// ---------------------------------------------------------------------------

describe('extractUrls', () => {
  it('returns empty array for text with no URLs', () => {
    expect(extractUrls('hello world, no links here!')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(extractUrls('')).toEqual([])
  })

  it('extracts a single https URL', () => {
    expect(extractUrls('Check out https://example.com for details')).toEqual(['https://example.com'])
  })

  it('extracts a single http URL', () => {
    expect(extractUrls('Old site: http://example.com')).toEqual(['http://example.com'])
  })

  it('extracts multiple URLs from a line', () => {
    const text = 'See https://github.com and https://google.com for more info'
    expect(extractUrls(text)).toEqual(['https://github.com', 'https://google.com'])
  })

  it('extracts URLs across multiple lines', () => {
    const text = 'First: https://one.com\nSecond: https://two.com'
    expect(extractUrls(text)).toEqual(['https://one.com', 'https://two.com'])
  })

  it('deduplicates identical URLs', () => {
    const text = 'https://example.com appears twice: https://example.com'
    expect(extractUrls(text)).toEqual(['https://example.com'])
  })

  it('strips trailing period', () => {
    expect(extractUrls('Visit https://example.com.')).toEqual(['https://example.com'])
  })

  it('strips trailing comma', () => {
    expect(extractUrls('Links: https://example.com, and more')).toEqual(['https://example.com'])
  })

  it('strips trailing semicolon', () => {
    expect(extractUrls('See https://example.com; done')).toEqual(['https://example.com'])
  })

  it('strips trailing closing parenthesis', () => {
    expect(extractUrls('(see https://example.com)')).toEqual(['https://example.com'])
  })

  it('strips trailing closing bracket', () => {
    expect(extractUrls('[https://example.com]')).toEqual(['https://example.com'])
  })

  it('strips trailing closing angle bracket', () => {
    expect(extractUrls('<https://example.com>')).toEqual(['https://example.com'])
  })

  it('strips trailing single quote', () => {
    expect(extractUrls("'https://example.com'")).toEqual(['https://example.com'])
  })

  it('strips trailing double quote', () => {
    expect(extractUrls('"https://example.com"')).toEqual(['https://example.com'])
  })

  it('preserves URLs with query parameters', () => {
    const url = 'https://example.com/search?q=hello+world&lang=en'
    expect(extractUrls(`Check ${url}`)).toEqual([url])
  })

  it('preserves URLs with fragments', () => {
    const url = 'https://example.com/docs#installation'
    expect(extractUrls(url)).toEqual([url])
  })

  it('preserves URLs with paths', () => {
    const url = 'https://github.com/owner/repo/pull/123'
    expect(extractUrls(`PR: ${url}`)).toEqual([url])
  })

  it('preserves URLs with port numbers', () => {
    const url = 'https://localhost:3000/api/v1'
    expect(extractUrls(url)).toEqual([url])
  })

  it('handles mixed valid and invalid adjacent text', () => {
    const text = 'no-url https://valid.com no-url-either'
    expect(extractUrls(text)).toEqual(['https://valid.com'])
  })
})
