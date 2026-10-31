import { describe, expect, it, vi } from 'vitest';
import { watchNavigation } from '../src/lib/github/navigation.ts';

function setup() {
  const window = new EventTarget();
  const document = new EventTarget();
  const onNavigate = vi.fn<() => void>();
  const deferred: Array<() => void> = [];

  watchNavigation({
    window,
    document,
    listen: (target, type, handler) => target.addEventListener(type, handler),
    defer: (callback) => deferred.push(callback),
    onNavigate,
  });

  return { window, document, onNavigate, deferred };
}

describe('watchNavigation', () => {
  it('waits for the location to change before reading the page after a WXT location change', () => {
    const { window, onNavigate, deferred } = setup();

    window.dispatchEvent(new Event('wxt:locationchange'));
    expect(onNavigate).not.toHaveBeenCalled();

    for (const callback of deferred) callback();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('reads the page again once Turbo has rendered it', () => {
    const { document, onNavigate } = setup();

    document.dispatchEvent(new Event('turbo:load'));
    document.dispatchEvent(new Event('turbo:render'));

    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  it('reads the page again on history navigation', () => {
    const { window, onNavigate } = setup();

    window.dispatchEvent(new Event('popstate'));

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
