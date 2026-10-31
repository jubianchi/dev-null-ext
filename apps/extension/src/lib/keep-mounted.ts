/**
 * Keeps an element in the page while its anchor is there. WXT's autoMount only watches the anchor come and go, so it
 * misses React replacing the anchor in one go (hydration, re-render): the new anchor is there, the element is not.
 * This watches the element itself.
 */

export interface KeepMounted {
  element: () => Element | undefined;
  anchor: () => Element | null;
  mount: (anchor: Element) => void;
  root: Node;
  signal: AbortSignal;
}

export function keepMounted({ element, anchor, mount, root, signal }: KeepMounted): void {
  const ensure = () => {
    if (signal.aborted || element()?.isConnected) return;

    const target = anchor();
    if (target) mount(target);
  };

  const observer = new MutationObserver(ensure);
  observer.observe(root, { childList: true, subtree: true });
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });

  ensure();
}
