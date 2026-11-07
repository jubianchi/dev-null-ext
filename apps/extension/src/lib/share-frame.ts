import type { WebPage } from './web-page.ts';

/**
 * Alt+Shift+D off GitHub: the extension's share page, framed over the page. An extension's page keeps its own styles
 * and escapes the site's CSP for its images, which a composer drawn in the page itself couldn't.
 */

/** The element the injected script draws: the backdrop, holding the frame. */
export const FRAME_ID = 'dev-null-share-frame';

/** The share page's URL, the page it shares in its fragment: the fragment is never sent, not even to the extension. */
export function shareFrameUrl(base: string, page: WebPage): string {
  return `${base}#${encodeURIComponent(JSON.stringify(page))}`;
}

/** The page to share, from the share page's own fragment; null when it carries none. */
export function readShareContext(hash: string): WebPage | null {
  try {
    const page = JSON.parse(decodeURIComponent(hash.replace(/^#/, ''))) as Partial<WebPage> | null;
    return typeof page?.url === 'string' && typeof page.title === 'string' ? (page as WebPage) : null;
  } catch {
    return null;
  }
}

/**
 * Draws the backdrop and the frame over the page, replacing those it drew before. They go away on Escape, on a click
 * on the backdrop, or when the frame asks; the frame also tells the height its content needs. Only messages from its
 * own frame count: the page can't close it, nor size it.
 *
 * It runs in the page, injected with `scripting.executeScript`, so it MUST stay self-contained: no import, no outer
 * helper, the identifiers written out.
 */
export function insertShareFrame(src: string): void {
  const id = 'dev-null-share-frame';
  document.getElementById(id)?.remove();

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const host = document.createElement('div');
  host.id = id;
  host.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;display:flex;justify-content:center;align-items:flex-start;padding:10vh 16px 0;background:rgba(9,9,11,.5);box-sizing:border-box';

  // Painted as the share page will be, dev-null.sh's surface light or dark, so it doesn't flash while it loads.
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = 'Commit this page to /dev/null';
  frame.style.cssText = `width:560px;max-width:100%;height:480px;max-height:80vh;border:0;border-radius:12px;box-shadow:0 24px 48px rgba(0,0,0,.25);color-scheme:normal;background:${dark ? '#18181a' : '#ffffff'}`;
  host.append(frame);

  const close = () => {
    host.remove();
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('message', onMessage);
    previousFocus?.focus();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || typeof event.data !== 'object' || event.data === null) return;
    const message = event.data as { type?: unknown; height?: unknown };
    if (message.type === 'dev-null-share:close') close();
    if (message.type === 'dev-null-share:height' && typeof message.height === 'number') frame.style.height = `${Math.ceil(message.height)}px`;
  };

  host.addEventListener('click', (event) => {
    if (event.target === host) close();
  });
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('message', onMessage);
  document.documentElement.append(host);
  frame.focus();
}
