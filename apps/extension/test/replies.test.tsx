// @vitest-environment happy-dom
import type { Commit, DeletedCommit } from '@devnull-github/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { Replies } = await import('../src/components/Replies.tsx');

const author = { id: '1', handle: 'jubianchi', name: 'Julien', avatar_url: null, bio: null, github_url: '', html_url: 'https://dev-null.sh/@jubianchi' };
const reply = (id: string, body: string): Commit => ({
  id,
  short_hash: id,
  body,
  parent_id: 'c1',
  html_url: `https://dev-null.sh/@jubianchi/commits/${id}`,
  created_at: '2026-10-30T10:00:00Z',
  stars_count: 0,
  replies_count: 0,
  author,
});
const parent = { ...reply('c1', 'Shipped'), parent_id: null, replies_count: 3 };

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(preview: { data: Array<Commit | DeletedCommit>; next_cursor: string | null }, replies = parent.replies_count) {
  await act(async () => {
    render(<Replies parent={{ ...parent, replies_count: replies }} preview={preview} />, root);
  });
}

const more = () => [...root.querySelectorAll('button')].find((button) => /^Show/.test(button.textContent ?? ''));

describe('Replies', () => {
  it('shows the newest reply under the commit', async () => {
    await show({ data: [reply('r3', 'Newest')], next_cursor: 'cursor-1' });

    expect(root.querySelectorAll('[data-reply]')).toHaveLength(1);
    expect(root.textContent).toContain('Newest');
    expect(root.textContent).toContain('@jubianchi');
  });

  it('loads the older replies, newest first, from the preview cursor', async () => {
    ask.mockResolvedValueOnce({ data: [reply('r2', 'Older'), reply('r1', 'Oldest')], meta: { next_cursor: null } });
    await show({ data: [reply('r3', 'Newest')], next_cursor: 'cursor-1' });

    expect(more()?.textContent).toBe('Show 2 more');
    await act(async () => more()!.click());
    await act(async () => {});

    expect(ask).toHaveBeenCalledWith({ type: 'replies', commitId: 'c1', cursor: 'cursor-1' });
    expect([...root.querySelectorAll('[data-reply]')].map((element) => element.textContent?.includes('Older'))).toEqual([false, true, false]);
    expect(more()).toBeUndefined();
  });

  it('says the last reply when only one is left', async () => {
    await show({ data: [reply('r2', 'Newest')], next_cursor: 'cursor-1' }, 2);

    expect(more()?.textContent).toBe('Show the last reply');
  });

  it('shows a deleted reply as such', async () => {
    await show({ data: [{ id: 'r9', parent_id: 'c1', deleted_at: '2026-10-30T10:00:00Z' }], next_cursor: null }, 1);

    expect(root.textContent).toContain('This commit was deleted.');
  });

  it('shows nothing when there is no reply', async () => {
    await show({ data: [], next_cursor: null }, 0);

    expect(root.innerHTML).toBe('');
  });
});
