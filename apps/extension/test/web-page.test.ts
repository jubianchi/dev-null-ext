import { describe, expect, it } from 'vitest';
import { cleanUrl, MIN_OWN_LENGTH, ownLength, pageKind, privacyWarning } from '../src/lib/web-page.ts';

describe('cleanUrl', () => {
  it('removes the tracking parameters, and keeps the others in their order', () => {
    expect(cleanUrl('https://example.com/post?utm_source=x&id=42&utm_medium=social&fbclid=abc&lang=fr')).toBe('https://example.com/post?id=42&lang=fr');
    expect(cleanUrl('https://example.com/?gclid=1&msclkid=2&mc_eid=3&mc_cid=4&igshid=5&dclid=6&gbraid=7&wbraid=8&yclid=9&twclid=10&_hsenc=11&_hsmi=12')).toBe(
      'https://example.com/',
    );
  });

  it('keeps the fragment, which often points at the section that matters', () => {
    expect(cleanUrl('https://cbea.ms/git-commit/?utm_source=hn#seven-rules')).toBe('https://cbea.ms/git-commit/#seven-rules');
  });

  it('leaves a URL without tracking as it is, byte for byte', () => {
    expect(cleanUrl('https://cbea.ms/git-commit/')).toBe('https://cbea.ms/git-commit/');
    expect(cleanUrl('https://example.com/search?q=a+b&page=2')).toBe('https://example.com/search?q=a+b&page=2');
  });
});

describe('privacyWarning', () => {
  it('says nothing of a public page', () => {
    expect(privacyWarning('https://cbea.ms/git-commit/')).toBeNull();
    expect(privacyWarning('https://example.com/?keyword=git&author=me')).toBeNull();
  });

  it('warns about a host others may not reach: local, private network, intranet', () => {
    for (const url of [
      'http://localhost:3000/',
      'http://127.0.0.1/',
      'http://[::1]/',
      'http://10.0.0.4/',
      'http://172.20.1.1/',
      'http://192.168.1.145:8080/',
      'http://169.254.1.1/',
      'http://nas.local/',
      'https://wiki.internal/',
      'http://router.lan/',
      'http://app.localhost/',
      'http://intranet/',
    ]) {
      expect(privacyWarning(url), url).toMatch(/^This page looks private \(.+\): others may not be able to open it\.$/);
    }
    expect(privacyWarning('http://172.32.0.1/')).toBeNull();
  });

  it('warns about a link that may hold a secret', () => {
    expect(privacyWarning('https://example.com/reset?token=abc')).toBe('This link may hold a secret (token): check it before you share it.');
    expect(privacyWarning('https://example.com/?api_key=1')).toBe('This link may hold a secret (api_key): check it before you share it.');
    expect(privacyWarning('https://example.com/callback?code=1&state=2')).toBe('This link may hold a secret (code): check it before you share it.');
  });
});

describe('pageKind', () => {
  it('tells a web page from github.com, which shares its pages with its own buttons', () => {
    expect(pageKind('https://cbea.ms/git-commit/')).toBe('web');
    expect(pageKind('http://example.com')).toBe('web');
    expect(pageKind('https://github.com/laravel/framework')).toBe('github');
    expect(pageKind('https://gist.github.com/jubianchi/1')).toBe('web');
  });

  it("tells a page that isn't on the web: the browser's own, files, extensions", () => {
    expect(pageKind('chrome://extensions')).toBe('off-web');
    expect(pageKind('about:blank')).toBe('off-web');
    expect(pageKind('file:///Users/me/notes.pdf')).toBe('off-web');
    expect(pageKind('chrome-extension://abc/popup.html')).toBe('off-web');
    expect(pageKind('moz-extension://abc/popup.html')).toBe('off-web');
    expect(pageKind(undefined)).toBe('off-web');
    expect(pageKind('not a URL')).toBe('off-web');
  });
});

describe('ownLength', () => {
  const link = 'https://cbea.ms/git-commit/';

  it("counts the user's own words, without the page's link", () => {
    expect(ownLength(`Still the reference.\n\n${link}`, link)).toBe('Still the reference.'.length);
  });

  it('leaves the quoted lines out, as they are the page speaking', () => {
    expect(ownLength(`> Separate subject from body\n\nSo true.\n\n${link}`, link)).toBe('So true.'.length);
  });

  it('counts mentions, and code points rather than UTF-16 units', () => {
    expect(ownLength('@jubianchi 👍', link)).toBe(12);
  });

  it('asks for 50 characters', () => {
    expect(MIN_OWN_LENGTH).toBe(50);
  });
});
