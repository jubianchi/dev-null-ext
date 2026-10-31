/**
 * When to read the page again. WXT's `wxt:locationchange` comes from the Navigation API's `navigate` event, which
 * fires before `location` changes and before Turbo renders the new page: it is deferred, and Turbo's own events
 * catch the render that follows.
 */

export interface NavigationWatch {
  window: EventTarget;
  document: EventTarget;
  listen: (target: EventTarget, type: string, handler: () => void) => void;
  defer: (callback: () => void) => void;
  onNavigate: () => void;
}

export function watchNavigation({ window, document, listen, defer, onNavigate }: NavigationWatch): void {
  listen(window, 'wxt:locationchange', () => defer(onNavigate));
  listen(window, 'popstate', onNavigate);
  listen(document, 'turbo:load', onNavigate);
  listen(document, 'turbo:render', onNavigate);
}
