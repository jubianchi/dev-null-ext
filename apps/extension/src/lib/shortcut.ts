/**
 * Alt+Shift+D, the browser-wide shortcut to commit about the page on screen. On github.com, it opens the composer of
 * the page's own share button: the background tells the tab's content script, which tells that button.
 */

/** The command, as the manifest declares it. */
export const SHARE_PAGE_COMMAND = 'share-page';

/** What the background sends the content script of the tab the shortcut was pressed in. */
export const SHARE_PAGE_MESSAGE = { type: 'share-page' } as const;

export function isSharePageMessage(message: unknown): boolean {
  return typeof message === 'object' && message !== null && (message as { type?: unknown }).type === SHARE_PAGE_MESSAGE.type;
}

/** Within the content script, from its message listener to the share button: one event on the window. */
const EVENT = 'dev-null:share-page';

export function dispatchSharePage(): void {
  window.dispatchEvent(new Event(EVENT));
}

/** Calls back when the shortcut asks for the page's composer; returns how to stop. */
export function onSharePage(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
