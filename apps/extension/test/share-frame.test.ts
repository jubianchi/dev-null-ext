// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { FRAME_ID, insertShareFrame, readShareContext, shareFrameUrl } from '../src/lib/share-frame.ts';

const page = {
  url: 'https://cbea.ms/git-commit/',
  title: 'How to Write a Git Commit Message',
  meta: { title: 'Git commit', description: null, image: null, siteName: null, selection: 'Separate subject from body' },
  selection: 'Separate subject from body',
};

afterEach(() => {
  document.getElementById(FRAME_ID)?.remove();
});

describe('the share frame URL', () => {
  it('carries the page in its fragment, which never leaves the browser, and gives it back', () => {
    const url = shareFrameUrl('chrome-extension://abc/share.html', page);

    expect(url.startsWith('chrome-extension://abc/share.html#')).toBe(true);
    expect(readShareContext(new URL(url).hash)).toEqual(page);
  });

  it('gives nothing back from a fragment that is not a page', () => {
    expect(readShareContext('')).toBeNull();
    expect(readShareContext('#not-json')).toBeNull();
    expect(readShareContext(`#${encodeURIComponent(JSON.stringify({ title: 'no URL' }))}`)).toBeNull();
  });
});

describe('insertShareFrame', () => {
  const frame = () => document.querySelector<HTMLIFrameElement>(`#${FRAME_ID} iframe`);

  it('frames the share page over the page, on a backdrop', () => {
    insertShareFrame('https://example.com/share.html#x');

    const host = document.getElementById(FRAME_ID);
    expect(host?.parentElement).toBe(document.documentElement);
    expect(host?.style.position).toBe('fixed');
    expect(frame()?.getAttribute('src')).toBe('https://example.com/share.html#x');
    expect(frame()?.title).toBe('Commit this page to /dev/null');
  });

  it('replaces the frame it inserted before, rather than stacking another', () => {
    insertShareFrame('https://example.com/share.html#1');
    insertShareFrame('https://example.com/share.html#2');

    expect(document.querySelectorAll(`#${FRAME_ID}`)).toHaveLength(1);
    expect(frame()?.getAttribute('src')).toBe('https://example.com/share.html#2');
  });

  it('closes on Escape, and on a click on the backdrop', () => {
    insertShareFrame('https://example.com/share.html#x');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById(FRAME_ID)).toBeNull();

    insertShareFrame('https://example.com/share.html#x');
    document.getElementById(FRAME_ID)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById(FRAME_ID)).toBeNull();
  });

  it('listens to its own frame only: closes when it asks, and takes the height it needs', () => {
    insertShareFrame('https://example.com/share.html#x');
    const source = frame()?.contentWindow ?? null;

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'dev-null-share:height', height: 420 }, source }));
    expect(frame()?.style.height).toBe('420px');

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'dev-null-share:close' }, source: window }));
    expect(document.getElementById(FRAME_ID)).not.toBeNull();

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'dev-null-share:close' }, source }));
    expect(document.getElementById(FRAME_ID)).toBeNull();
  });
});
