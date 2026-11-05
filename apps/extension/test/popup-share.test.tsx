// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { PopupShare } = await import('../src/components/PopupShare.tsx');

const article = { url: 'https://cbea.ms/git-commit/', title: 'How to Write a Git Commit Message' };
const viewer = { id: 'me', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };

let root: HTMLElement;
const onBack = vi.fn();

beforeEach(() => {
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? viewer : null));
  onBack.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

describe('PopupShare', () => {
  it("opens the composer on the page's link, under a header that goes back to the card", async () => {
    await act(async () => {
      render(<PopupShare page={article} onBack={onBack} />, root);
    });
    await act(async () => {});
    await act(async () => {});

    expect(root.querySelector('h1')?.textContent).toBe('Commit this page');
    expect(root.querySelector('textarea')?.value).toBe(`\n\n${article.url}`);

    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Back"]')?.click());
    expect(onBack).toHaveBeenCalledOnce();
  });
});
