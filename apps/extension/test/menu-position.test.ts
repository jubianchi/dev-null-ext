import { describe, expect, it } from 'vitest';
import { menuPosition } from '../src/lib/menu-position.ts';

const viewport = { width: 1000, height: 800 };
const menu = { width: 288, height: 120 };

describe('menuPosition', () => {
  it('opens above its button, aligned on its left edge, when there is room', () => {
    expect(menuPosition({ top: 500, bottom: 532, left: 100 }, menu, viewport)).toEqual({ top: 500 - 4 - 120, left: 100 });
  });

  it('opens below its button when there is no room above', () => {
    expect(menuPosition({ top: 60, bottom: 92, left: 100 }, menu, viewport)).toEqual({ top: 92 + 4, left: 100 });
  });

  it('opens below its button first when asked to, above it when there is no room below', () => {
    expect(menuPosition({ top: 500, bottom: 532, left: 100 }, menu, viewport, 'below')).toEqual({ top: 532 + 4, left: 100 });
    expect(menuPosition({ top: 700, bottom: 732, left: 100 }, menu, viewport, 'below')).toEqual({ top: 700 - 4 - 120, left: 100 });
  });

  it('opens below when it fits on neither side, where the page can still scroll to it', () => {
    const tall = { width: 288, height: 700 };

    expect(menuPosition({ top: 300, bottom: 332, left: 100 }, tall, viewport, 'below').top).toBe(332 + 4);
    expect(menuPosition({ top: 300, bottom: 332, left: 100 }, tall, viewport).top).toBe(332 + 4);
  });

  it('stays within the viewport horizontally', () => {
    expect(menuPosition({ top: 500, bottom: 532, left: 900 }, menu, viewport).left).toBe(1000 - 8 - 288);
    expect(menuPosition({ top: 500, bottom: 532, left: -20 }, menu, viewport).left).toBe(8);
  });
});
