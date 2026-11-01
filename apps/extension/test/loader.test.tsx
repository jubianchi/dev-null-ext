// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Loader } from '../src/components/Loader.tsx';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

describe('Loader', () => {
  it('says what is loading, politely, to assistive technologies', async () => {
    await act(async () => {
      render(<Loader label="Reading the log…" />, root);
    });

    const status = root.querySelector('[role="status"]');
    expect(status?.textContent).toBe('Reading the log…');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it("draws /dev/null's glyph as the mobile app's splash: the ink slash popping, the lane-0 outline drawn", async () => {
    await act(async () => {
      render(<Loader label="Loading" />, root);
    });

    const svg = root.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelector('.loader-ink')?.getAttribute('d')).toBe('M2 42h10L26 6H16Z');
    const outline = svg?.querySelector('.loader-outline');
    expect(outline?.getAttribute('d')).toBe('M39 6L44 6L30 42L20 42L34 6Z');
    expect(outline?.getAttribute('pathLength')).toBe('100');
    expect(outline?.getAttribute('fill')).toBe('none');
  });
});
