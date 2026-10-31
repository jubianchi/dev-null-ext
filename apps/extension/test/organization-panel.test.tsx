// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { OrganizationPanel } = await import('../src/components/OrganizationPanel.tsx');
const { composerMode } = await import('../src/lib/composer-mode.ts');

const user = { id: '1', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };

/** An IntersectionObserver the test drives: `scroll(false)` takes the observed elements out of view. */
const observers: Array<{ callback: IntersectionObserverCallback; targets: Element[] }> = [];
class FakeIntersectionObserver {
  readonly entry: { callback: IntersectionObserverCallback; targets: Element[] };
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, targets: [] };
    observers.push(this.entry);
  }
  observe(target: Element) {
    this.entry.targets.push(target);
  }
  unobserve() {}
  disconnect() {}
}

async function scroll(inView: boolean) {
  await act(async () => {
    for (const { callback, targets } of observers) {
      callback(
        targets.map((target) => ({ target, isIntersecting: inView }) as IntersectionObserverEntry),
        {} as IntersectionObserver,
      );
    }
  });
}

let root: HTMLElement;

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) =>
    request.type === 'session' ? user : { data: [], meta: { next_cursor: null } },
  );
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
  vi.unstubAllGlobals();
});

describe('composerMode', () => {
  it('is inline above a log whose top is in view, modal otherwise', () => {
    expect(composerMode({ log: true, topInView: true })).toBe('inline');
    expect(composerMode({ log: true, topInView: false })).toBe('modal');
    expect(composerMode({ log: false, topInView: true })).toBe('modal');
  });
});

describe('OrganizationPanel', () => {
  beforeEach(async () => {
    await act(async () => {
      render(<OrganizationPanel organization="laravel" />, root);
    });
  });

  it('keeps its header, and its Commit button, at the top of the screen', () => {
    expect(root.querySelector('header')?.className).toContain('sticky');
  });

  it('shows the composer inline above the log, without taking the focus', () => {
    const textarea = root.querySelector('textarea');

    expect(textarea).not.toBeNull();
    expect(root.querySelector('dialog')).toBeNull();
    expect(document.activeElement).not.toBe(textarea);
  });

  it('focuses the inline composer from the header while the top of the log is in view', async () => {
    await scroll(true);
    await act(async () => root.querySelector<HTMLButtonElement>('header button')!.click());

    expect(root.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('textarea'));
  });

  it('opens the composer in a modal from the header once the log is scrolled down', async () => {
    await scroll(false);
    await act(async () => root.querySelector<HTMLButtonElement>('header button')!.click());

    expect(root.querySelector('dialog')?.open).toBe(true);
  });
});
