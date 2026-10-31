export interface Mounted {
  element: Element;
  remove(): void;
}

export interface KeepEachMounted {
  /** The places to mount in, found again on every change of the page. */
  find: () => Element[];
  mount: (place: Element) => Promise<Mounted>;
  root: Node;
  signal: AbortSignal;
}

/**
 * Keeps one UI mounted in each of the places the page has, as keepMounted keeps one: in the places the page adds
 * (more releases, another page of them), and again where GitHub's rendering replaced a place.
 */
export function keepEachMounted({ find, mount, root, signal }: KeepEachMounted): void {
  const mounted = new Map<Element, Mounted | 'pending'>();

  const ensure = () => {
    if (signal.aborted) return;

    for (const [place, ui] of mounted) {
      if (!place.isConnected) {
        if (ui !== 'pending') ui.remove();
        mounted.delete(place);
      }
    }

    for (const place of find()) {
      const ui = mounted.get(place);
      if (ui === 'pending' || ui?.element.isConnected) continue;

      mounted.set(place, 'pending');
      void mount(place).then((result) => {
        if (signal.aborted || !place.isConnected) return result.remove();
        mounted.set(place, result);
      });
    }
  };

  const observer = new MutationObserver(ensure);
  observer.observe(root, { childList: true, subtree: true });
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect();
      for (const ui of mounted.values()) if (ui !== 'pending') ui.remove();
      mounted.clear();
    },
    { once: true },
  );

  ensure();
}
