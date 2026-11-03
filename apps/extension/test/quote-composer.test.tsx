// @vitest-environment happy-dom
import type { Commit, CurrentUser } from '@dev-null-ext/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { CommitItem } = await import('../src/components/CommitItem.tsx');
const { BackgroundError } = await import('../src/lib/messages.ts');

const viewer: CurrentUser = { id: 'me', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };
const taylor = { id: 't', handle: 'taylorotwell', name: 'Taylor Otwell', avatar_url: null, bio: null, github_url: '', html_url: '' };

const commit: Commit = {
  id: 'c1',
  short_hash: 'abc1234',
  body: 'Shipped Laravel 13',
  parent_id: null,
  html_url: 'https://dev-null.sh/@taylorotwell/commits/c1',
  created_at: '2026-10-30T10:00:00Z',
  replies_count: 0,
  stars_count: 0,
  author: taylor,
};

const quote: Commit = {
  id: 'q1',
  short_hash: 'def5678',
  body: 'So proud',
  parent_id: null,
  quoted_commit_id: 'c1',
  quoted_commit: commit,
  html_url: 'https://dev-null.sh/@jubianchi/commits/q1',
  created_at: '2026-10-31T10:00:00Z',
  status: 'approved',
  author: { ...viewer },
};

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) => {
    if (request.type === 'session') return viewer;
    if (request.type === 'mention-suggestions') return { users: [], organizations: [] };
    if (request.type === 'commit') return quote;
    return null;
  });
  root = document.createElement('ul');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(canReply = true, shown: Commit = commit) {
  await act(async () => {
    render(<CommitItem commit={shown} canReply={canReply} viewer={viewer.handle} />, root);
  });
}

const quoteButton = () => root.querySelector<HTMLButtonElement>('button[aria-label="Quote @taylorotwell"]');
const dialog = () => root.querySelector<HTMLDialogElement>('dialog[data-quote-composer]');
const textarea = () => dialog()?.querySelector('textarea') ?? null;
const button = (text: string) => [...(dialog()?.querySelectorAll('button') ?? [])].find((candidate) => candidate.textContent === text);

async function openComposer() {
  await act(async () => quoteButton()!.click());
  await act(async () => {});
}

async function write(value: string) {
  await act(async () => {
    textarea()!.value = value;
    textarea()!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function send() {
  await act(async () => {
    dialog()!
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await act(async () => {});
}

describe('Quoting from a log', () => {
  it('offers a Quote button among the actions, as dev-null.sh does', async () => {
    await show();

    expect(quoteButton()?.textContent).toBe('Quote');
    expect(quoteButton()?.querySelector('svg.lucide-quote')).not.toBeNull();
  });

  it('opens a dialog as dev-null.sh does: who is quoted, the take to add, then the quoted commit', async () => {
    await show();
    expect(dialog()).toBeNull();

    await openComposer();
    expect(dialog()?.open).toBe(true);
    expect(dialog()?.querySelector('h2')?.textContent).toBe('Quote @taylorotwell');
    expect(textarea()?.getAttribute('placeholder')).toBe('Add your take');
    expect(textarea()?.getAttribute('aria-label')).toBe('Quote @taylorotwell');
    expect(document.activeElement).toBe(textarea());

    const card = dialog()?.querySelector('[data-quoted-commit]');
    expect(card?.textContent).toContain('Shipped Laravel 13');
    expect(card?.querySelector('a')).toBeNull();
    expect(card?.compareDocumentPosition(textarea()!)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it('attaches images and previews, but offers no poll, which /dev/null refuses on a quote', async () => {
    await show();
    await openComposer();

    expect(dialog()?.querySelector('button[aria-label="Attach images"]')).not.toBeNull();
    expect(dialog()?.querySelector('button[aria-label="Preview"]')).not.toBeNull();
    expect(dialog()?.querySelector('button[aria-label="Add poll"]')).toBeNull();
  });

  it('closes from Cancel', async () => {
    await show();
    await openComposer();

    await act(async () => button('Cancel')!.click());
    await act(async () => {});
    expect(dialog()).toBeNull();
  });

  it('sends the quote with the quoted commit, then closes', async () => {
    await show();
    await openComposer();
    expect(button('Quote')?.disabled).toBe(true);

    await write('So proud');
    await send();

    expect(ask).toHaveBeenCalledWith({ type: 'commit', body: 'So proud', quotedCommitId: 'c1' });
    expect(dialog()).toBeNull();
  });

  it('lists the quote sent among the commit’s replies, marked as a quote, and counts it', async () => {
    await show(true, { ...commit, replies_count: 2, reply_preview: { data: [], next_cursor: 'next' } });
    await openComposer();
    await write('So proud');
    await send();

    const sent = root.querySelector('[data-reply]');
    expect(sent?.textContent).toContain('So proud');
    expect(sent?.textContent).toContain('quoted');
    expect(root.textContent).toContain('Show the last 2');
  });

  it("offers no Quote on someone else's commit not approved yet, which /dev/null refuses to quote", async () => {
    await show(true, { ...commit, status: 'pending' });
    expect(quoteButton()).toBeNull();
    expect([...root.querySelectorAll('a')].some((link) => link.textContent === 'Quote')).toBe(false);

    await show(true, { ...commit, status: 'pending', author: { ...taylor, handle: 'JuBianchi' } });
    expect(root.querySelector('button[aria-label="Quote @JuBianchi"]')).not.toBeNull();
  });

  it("says why a quote wasn't sent, and keeps it", async () => {
    ask.mockImplementation(async (request: { type: string }) => {
      if (request.type === 'session') return viewer;
      if (request.type === 'commit') throw new (BackgroundError as unknown as new (message: string) => Error)('That commit is no longer available.');
      return { users: [], organizations: [] };
    });
    await show();
    await openComposer();
    await write('So proud');
    await send();

    expect(dialog()?.textContent).toContain('That commit is no longer available.');
    expect(textarea()?.value).toBe('So proud');
  });

  it('still quotes on /dev/null when the user is signed out', async () => {
    await show(false);

    expect(quoteButton()).toBeNull();
    expect([...root.querySelectorAll('a')].find((link) => link.textContent === 'Quote')?.getAttribute('href')).toBe(commit.html_url);
  });
});
