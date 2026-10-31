// @vitest-environment happy-dom
import type { Commit } from '@devnull-github/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { OrganizationSidebar } = await import('../src/components/OrganizationSidebar.tsx');

const user = { id: '1', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };
const commit = (id: string, body: string): Commit => ({
  id,
  short_hash: id,
  body,
  parent_id: null,
  html_url: `https://dev-null.sh/@simonhamp/commits/${id}`,
  created_at: '2026-10-30T10:00:00Z',
  author: { id: '2', handle: 'simonhamp', name: 'Simon', avatar_url: null, bio: null, github_url: '', html_url: '' },
});

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

async function show(session: typeof user | null, commits: Commit[]) {
  ask.mockImplementation(async (request: { type: string }) =>
    request.type === 'session' ? session : { data: commits, meta: { next_cursor: null } },
  );
  await act(async () => {
    render(<OrganizationSidebar organization="NativePHP" />, root);
  });
  await act(async () => {});
}

describe('OrganizationSidebar', () => {
  it('shows the three latest commits mentioning the organization, as a sidebar section of GitHub', async () => {
    await show(user, [commit('a1', 'First'), commit('b2', 'Second'), commit('c3', 'Third'), commit('d4', 'Fourth')]);

    expect(root.querySelector('h2')?.textContent).toContain('On /dev/null');
    expect([...root.querySelectorAll('li')].map((item) => item.textContent?.includes('@simonhamp'))).toEqual([true, true, true]);
    expect(root.textContent).toContain('First');
    expect(root.textContent).not.toContain('Fourth');
    expect(root.querySelector('li a')?.getAttribute('href')).toBe('https://dev-null.sh/@simonhamp/commits/a1');
  });

  it("leads to the organization's /dev/null tab", async () => {
    await show(user, [commit('a1', 'First')]);

    const all = [...root.querySelectorAll('a')].find((link) => link.getAttribute('href') === '#dev-null');
    expect(all?.textContent).toBe('All commits mentioning @NativePHP');
  });

  it('says when no commit mentions the organization yet', async () => {
    await show(user, []);

    expect(root.textContent).toContain('No commits mention @NativePHP yet.');
  });

  it('shows nothing when not connected to /dev/null', async () => {
    await show(null, [commit('a1', 'First')]);

    expect(root.innerHTML).toBe('');
    expect(ask).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'mentions' }));
  });
});
