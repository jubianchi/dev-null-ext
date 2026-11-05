import { describe, expect, it } from 'vitest';
import { MIN_OWN_LENGTH, ownLength, pageKind } from '../src/lib/web-page.ts';

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
