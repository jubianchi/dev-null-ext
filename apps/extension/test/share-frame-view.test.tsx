// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { ShareFrame } = await import('../src/components/ShareFrame.tsx');

const page = { url: 'https://cbea.ms/git-commit/', title: 'How to Write a Git Commit Message' };
const viewer = { id: 'me', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };

let root: HTMLElement;
const onClose = vi.fn();

beforeEach(() => {
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? viewer : null));
  onClose.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show() {
  await act(async () => {
    render(<ShareFrame page={page} onClose={onClose} />, root);
  });
  await act(async () => {});
  await act(async () => {});
}

describe('ShareFrame', () => {
  it("shows the share view under a header, the page's link inserted", async () => {
    await show();

    expect(root.querySelector('h1')?.textContent).toBe('Commit this page');
    expect(root.querySelector('textarea')?.value).toBe(`\n\n${page.url}`);
  });

  it('closes from its button, which says the stash is kept, and on Escape', async () => {
    await show();

    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Close, keeping the stash"]')?.click());
    expect(onClose).toHaveBeenCalledOnce();

    await act(async () => {
      root.querySelector('textarea')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('says what to do when the page is unknown', async () => {
    await act(async () => {
      render(<ShareFrame page={null} onClose={onClose} />, root);
    });

    expect(root.textContent).toContain('Nothing to commit: open this from a page, with Alt+Shift+D.');
  });
});
