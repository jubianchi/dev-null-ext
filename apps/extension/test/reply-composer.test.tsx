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

const reply: Commit = {
  id: 'r1',
  short_hash: 'def5678',
  body: 'Congrats!',
  body_segments: [{ type: 'text', text: 'Congrats!' }],
  parent_id: 'c1',
  html_url: 'https://dev-null.sh/@jubianchi/commits/r1',
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
    if (request.type === 'commit') return reply;
    return null;
  });
  root = document.createElement('ul');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(canReply = true) {
  await act(async () => {
    render(<CommitItem commit={commit} canReply={canReply} />, root);
  });
}

const replyButton = () => root.querySelector<HTMLButtonElement>('button[aria-label="Reply to @taylorotwell"]');
const textarea = () => root.querySelector<HTMLTextAreaElement>('[data-reply-composer] textarea');

async function openComposer() {
  await act(async () => replyButton()!.click());
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
    root.querySelector('[data-reply-composer] form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await act(async () => {});
}

describe('Replying from a log', () => {
  it('offers a Reply button among the actions, as dev-null.sh does', async () => {
    await show();

    expect(replyButton()?.textContent).toBe('Reply');
    expect(replyButton()?.querySelector('svg.lucide-message-square-reply')).not.toBeNull();
  });

  it('opens a reply composer under the commit from its Reply button, and closes it the same way', async () => {
    await show();
    expect(textarea()).toBeNull();

    await openComposer();
    expect(replyButton()?.getAttribute('aria-expanded')).toBe('true');
    expect(textarea()?.getAttribute('placeholder')).toBe('Reply to @taylorotwell');
    expect(textarea()?.getAttribute('aria-label')).toBe('Reply to @taylorotwell');
    expect(document.activeElement).toBe(textarea());

    await act(async () => replyButton()!.click());
    expect(textarea()).toBeNull();
  });

  it("doesn't mention the author for the user: /dev/null notifies them", async () => {
    await show();
    await openComposer();

    expect(textarea()?.value).toBe('');
  });

  it('sends the reply with its parent, then shows it under the commit, counted among its replies', async () => {
    await show();
    await openComposer();
    await write('Congrats!');
    await send();

    expect(ask).toHaveBeenCalledWith({ type: 'commit', body: 'Congrats!', parentId: 'c1' });
    expect(textarea()).toBeNull();
    expect(root.querySelector('[data-reply]')?.textContent).toContain('Congrats!');
    expect([...root.querySelectorAll('button')].some((button) => /^Show/.test(button.textContent ?? ''))).toBe(false);
  });

  it("says why a reply wasn't sent, and keeps it", async () => {
    ask.mockImplementation(async (request: { type: string }) => {
      if (request.type === 'session') return viewer;
      if (request.type === 'commit')
        throw new (BackgroundError as unknown as new (message: string) => Error)('That commit is no longer available to reply to.');
      return { users: [], organizations: [] };
    });
    await show();
    await openComposer();
    await write('Congrats!');
    await send();

    expect(root.querySelector('[data-reply-composer]')?.textContent).toContain('That commit is no longer available to reply to.');
    expect(textarea()?.value).toBe('Congrats!');
  });

  it("suggests the thread's people first while mentioning", async () => {
    await show();
    await openComposer();
    await write('@');

    expect(ask).toHaveBeenCalledWith({ type: 'mention-suggestions', query: '', reply: 'c1' });
  });

  it("offers none of a commit's additions: there is no page to share in a reply", async () => {
    await show();
    await openComposer();

    expect(root.querySelector('[data-reply-composer] button[aria-label^="Insert"]')).toBeNull();
  });

  it('still replies on /dev/null when the user is signed out', async () => {
    await show(false);

    expect(replyButton()).toBeNull();
    expect([...root.querySelectorAll('a')].find((link) => link.textContent === 'Reply')?.getAttribute('href')).toBe(commit.html_url);
  });
});
