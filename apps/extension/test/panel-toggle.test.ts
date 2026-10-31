import { describe, expect, it, vi } from 'vitest';
import { panelToggle } from '../src/lib/panel-toggle.ts';

function deferredPanel() {
  const remove = vi.fn<() => void>();
  let resolve: () => void = () => {};
  const ready = new Promise<void>((done) => (resolve = done));
  const open = vi.fn(async () => {
    await ready;
    return { remove };
  });

  return { open, remove, resolve: () => resolve() };
}

describe('panelToggle', () => {
  it('opens a single panel when shown again while it is still opening', async () => {
    const panel = deferredPanel();
    const toggle = panelToggle(panel.open);

    const first = toggle.show();
    const second = toggle.show();
    panel.resolve();
    await Promise.all([first, second]);

    expect(panel.open).toHaveBeenCalledOnce();
  });

  it('removes the panel when hidden', async () => {
    const panel = deferredPanel();
    const toggle = panelToggle(panel.open);

    panel.resolve();
    await toggle.show();
    toggle.hide();

    expect(panel.remove).toHaveBeenCalledOnce();
  });

  it('removes a panel that finishes opening after it was hidden', async () => {
    const panel = deferredPanel();
    const toggle = panelToggle(panel.open);

    const shown = toggle.show();
    toggle.hide();
    panel.resolve();
    await shown;

    expect(panel.remove).toHaveBeenCalledOnce();
  });

  it('opens again after being hidden', async () => {
    const panel = deferredPanel();
    const toggle = panelToggle(panel.open);
    panel.resolve();

    await toggle.show();
    toggle.hide();
    await toggle.show();

    expect(panel.open).toHaveBeenCalledTimes(2);
  });
});
