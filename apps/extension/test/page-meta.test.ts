// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { readPageMeta } from '../src/lib/page-meta.ts';

function head(html: string) {
  document.head.innerHTML = html;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('readPageMeta', () => {
  it('reads the Open Graph card the page declares', () => {
    head(`
      <meta property="og:title" content="How to Write a Git Commit Message">
      <meta property="og:description" content="Commit messages matter.">
      <meta property="og:image" content="https://cbea.ms/img/card.png">
      <meta property="og:site_name" content="cbea.ms">
    `);

    expect(readPageMeta()).toEqual({
      title: 'How to Write a Git Commit Message',
      description: 'Commit messages matter.',
      image: 'https://cbea.ms/img/card.png',
      siteName: 'cbea.ms',
    });
  });

  it("falls back on Twitter's card, the description and the document's title", () => {
    head(`
      <meta name="description" content="A plain description.">
      <meta name="twitter:image" content="https://example.com/t.png">
    `);
    document.title = 'Fallback title';

    expect(readPageMeta()).toEqual({ title: 'Fallback title', description: 'A plain description.', image: 'https://example.com/t.png', siteName: null });
  });

  it("resolves a relative image against the page, and leaves out one that isn't on the web", () => {
    head('<meta property="og:image" content="/card.png">');
    expect(readPageMeta().image).toBe(new URL('/card.png', location.href).href);

    head('<meta property="og:image" content="data:image/png;base64,AAAA">');
    expect(readPageMeta().image).toBeNull();
  });

  it('says nothing of what the page leaves empty', () => {
    head('<meta property="og:title" content="  ">');

    expect(readPageMeta()).toEqual({ title: null, description: null, image: null, siteName: null });
  });
});
