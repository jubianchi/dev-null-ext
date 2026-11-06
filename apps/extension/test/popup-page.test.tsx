// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { PopupPage } = await import('../src/components/PopupPage.tsx');

const article = { url: 'https://cbea.ms/git-commit/', title: 'How to Write a Git Commit Message' };

let root: HTMLElement;
const onShare = vi.fn();

beforeEach(() => {
  ask.mockReset();
  ask.mockResolvedValue({});
  onShare.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(tab: { url?: string; title?: string } | null) {
  await act(async () => {
    render(<PopupPage tab={tab} onShare={onShare} />, root);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const button = () => [...root.querySelectorAll('button')].find((candidate) => candidate.textContent?.startsWith('Commit this page'));

describe('PopupPage', () => {
  it('offers to commit a web page, with its host and title', async () => {
    await show(article);

    expect(root.textContent).toContain('On this page');
    expect(root.textContent).toContain('cbea.ms');
    expect(root.textContent).toContain('How to Write a Git Commit Message');

    await act(async () => button()?.click());
    expect(onShare).toHaveBeenCalledWith(article);
  });

  it('says a stash waits for the page, as dev-null.sh says one waits for a reply', async () => {
    ask.mockImplementation(async (request: { type: string }) => (request.type === 'stash:which' ? { [`page:${article.url}`]: true } : {}));
    await show(article);

    expect(ask).toHaveBeenCalledWith({ type: 'stash:which', names: [`page:${article.url}`] });
    expect(root.querySelector('[title="You have an unsent commit about this page"]')?.textContent).toBe('stash@{0}');
  });

  it('is disabled off the web, and says why', async () => {
    await show({ url: 'chrome://extensions', title: 'Extensions' });

    expect(button()?.disabled).toBe(true);
    expect(root.textContent).toContain("Only web pages can be committed: this one is the browser's own.");
  });

  it('shows nothing on github.com, whose pages have their own buttons, nor without a tab', async () => {
    await show({ url: 'https://github.com/laravel/framework', title: 'laravel/framework' });
    expect(root.innerHTML).toBe('');

    await show(null);
    expect(root.innerHTML).toBe('');
  });
});
