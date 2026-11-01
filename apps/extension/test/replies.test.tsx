// @vitest-environment happy-dom
import type { Commit, DeletedCommit } from '@dev-null-ext/client';
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

const older = (from: number, count: number) => Array.from({ length: count }, (_, index) => reply(`r${from - index}`, `Reply ${from - index}`));
const page = (data: Commit[], next: string | null = null) => ({ data, meta: { next_cursor: next } });

beforeEach(() => {
  ask.mockReset();
  ask.mockResolvedValue(page([]));
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
  await act(async () => {});
}

const more = () => [...root.querySelectorAll('button')].find((button) => /^Show/.test(button.textContent ?? ''));
const click = async () => {
  await act(async () => more()!.click());
  await act(async () => {});
};

describe('Replies', () => {
  it('shows the newest reply under the commit', async () => {
    await show({ data: [reply('r3', 'Newest')], next_cursor: null }, 1);

    expect(root.querySelectorAll('[data-reply]')).toHaveLength(1);
    expect(root.textContent).toContain('Newest');
    expect(root.textContent).toContain('@jubianchi');
  });

  it("shows the three newest replies, as dev-null.sh does, loading the two the API doesn't preview", async () => {
    ask.mockResolvedValueOnce(page(older(4, 4)));
    await show({ data: [reply('r5', 'Newest')], next_cursor: 'cursor-1' }, 5);

    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledWith({ type: 'replies', commitId: 'c1', cursor: 'cursor-1' });
    expect(root.querySelectorAll('[data-reply]')).toHaveLength(3);
    expect(root.textContent).toContain('Newest');
    expect(root.textContent).toContain('Reply 4');
    expect(root.textContent).toContain('Reply 3');
    expect(root.textContent).not.toContain('Reply 2');
    expect(more()?.textContent).toBe('Show the last 2');
  });

  it('shows the rest of the loaded replies on demand, newest first, without asking again', async () => {
    ask.mockResolvedValueOnce(page(older(4, 4)));
    await show({ data: [reply('r5', 'Newest')], next_cursor: 'cursor-1' }, 5);
    await click();

    expect(ask).toHaveBeenCalledTimes(1);
    expect(root.querySelectorAll('[data-reply]')).toHaveLength(5);
    expect(root.querySelectorAll('[data-reply]')[4]?.textContent).toContain('Reply 1');
    expect(more()).toBeUndefined();
  });

  it('asks for the next page once the loaded replies are all shown, and counts what is left', async () => {
    ask.mockResolvedValueOnce(page(older(59, 50), 'cursor-2')).mockResolvedValueOnce(page(older(9, 9)));
    await show({ data: [reply('r60', 'Newest')], next_cursor: 'cursor-1' }, 60);

    expect(more()?.textContent).toBe('Show 57 more');
    await click();
    expect(root.querySelectorAll('[data-reply]')).toHaveLength(51);
    expect(more()?.textContent).toBe('Show the last 9');

    await click();
    expect(ask).toHaveBeenLastCalledWith({ type: 'replies', commitId: 'c1', cursor: 'cursor-2' });
    expect(root.querySelectorAll('[data-reply]')).toHaveLength(60);
    expect(more()).toBeUndefined();
  });

  it("doesn't ask for replies when the preview holds them all", async () => {
    await show({ data: [reply('r1', 'Only')], next_cursor: null }, 1);

    expect(ask).not.toHaveBeenCalled();
  });

  it("keeps the preview, and loads the replies on demand, when the newest ones can't be loaded", async () => {
    ask.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([reply('r1', 'Oldest')]));
    await show({ data: [reply('r2', 'Newest')], next_cursor: 'cursor-1' }, 2);

    expect(root.querySelectorAll('[data-reply]')).toHaveLength(1);
    expect(more()?.textContent).toBe('Show the last reply');
    await click();
    expect(root.querySelectorAll('[data-reply]')).toHaveLength(2);
  });

  it("shows a reply's own replies, linking to it, as dev-null.sh's › 1 reply toggle", async () => {
    await show({ data: [{ ...reply('r3', 'Newest'), replies_count: 1 }], next_cursor: null }, 1);

    const replies = root.querySelector('a[aria-label="1 reply"]');
    expect(replies?.getAttribute('href')).toBe('https://dev-null.sh/@jubianchi/commits/r3');
    expect(replies?.textContent).toBe('1 reply');
    expect(replies?.querySelector('svg')?.getAttribute('class')).toContain('lucide-chevron-right');
    expect(replies?.className).toContain('text-fg-accent');
    expect(replies?.className).not.toContain('text-fg-muted');
  });

  it("gives a reply dev-null.sh's actions: Star and Reply, but no Quote", async () => {
    await show({ data: [{ ...reply('r3', 'Newest'), stars_count: 2 }], next_cursor: null }, 1);

    const actions = [...root.querySelectorAll('[data-reply] [data-actions] > *')];
    expect(actions.map((action) => action.getAttribute('title'))).toEqual(['Star', 'Reply on /dev/null']);
    expect(actions.map((action) => action.textContent)).toEqual(['2', 'Reply']);
  });

  it('says the last reply when only one is left', async () => {
    ask.mockResolvedValueOnce(page(older(3, 3)));
    await show({ data: [reply('r4', 'Newest')], next_cursor: 'cursor-1' }, 4);

    expect(more()?.textContent).toBe('Show the last reply');
  });

  it('shows a live reply as such, though signed requests send it with deleted_at: null', async () => {
    await show({ data: [{ ...reply('r3', 'Still here'), deleted_at: null }], next_cursor: null }, 1);

    expect(root.textContent).toContain('Still here');
    expect(root.textContent).not.toContain('This commit was deleted.');
  });

  it('marks the quotes among the replies, as dev-null.sh does', async () => {
    await show({ data: [{ ...reply('r3', 'Quoting it'), parent_id: null, quoted_commit_id: 'c1' }], next_cursor: null }, 1);

    expect(root.textContent).toContain('quoted');
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
