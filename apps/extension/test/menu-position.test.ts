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

  it('stays within the viewport horizontally', () => {
    expect(menuPosition({ top: 500, bottom: 532, left: 900 }, menu, viewport).left).toBe(1000 - 8 - 288);
    expect(menuPosition({ top: 500, bottom: 532, left: -20 }, menu, viewport).left).toBe(8);
  });
});
