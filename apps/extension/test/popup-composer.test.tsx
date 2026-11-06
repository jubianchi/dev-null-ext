// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { PopupComposer } = await import('../src/components/PopupComposer.tsx');

const page = { url: 'https://cbea.ms/git-commit/', title: 'How to Write a Git Commit Message' };
const viewer = { id: 'me', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };
const words = 'Still the reference I send to every new teammate, seven rules.';

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? viewer : null));
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show() {
  await act(async () => {
    render(<PopupComposer page={page} />, root);
  });
  await act(async () => {});
  await act(async () => {});
}

async function type(value: string) {
  const textarea = root.querySelector('textarea')!;
  await act(async () => {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const commit = () => root.querySelector<HTMLButtonElement>('footer button[type="submit"]');

describe('PopupComposer', () => {
  it('shows the page it shares, and what /dev/null will make of its link', async () => {
    await show();

    const card = root.querySelector('[data-page-card]');
    expect(card?.textContent).toContain('cbea.ms');
    expect(card?.textContent).toContain('How to Write a Git Commit Message');
    expect(card?.textContent).toContain('Unfurls into a link card after you commit.');
  });

  it("writes in a full-width box, opened on the page's link with the caret before it", async () => {
    await show();

    const textarea = root.querySelector('textarea');
    expect(textarea?.value).toBe(`\n\n${page.url}`);
    expect(textarea?.selectionStart).toBe(0);
    expect(document.activeElement).toBe(textarea);
    expect(root.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Write');
  });

  it('keeps the tools and Commit in a footer of their own, the count and the missing words above it', async () => {
    await show();

    const footer = root.querySelector('footer');
    expect(footer?.querySelector('[role="toolbar"] button[aria-label="Attach images"]')).not.toBeNull();
    expect(commit()?.disabled).toBe(true);
    expect(root.querySelector('[data-counter]')?.textContent).toBe('23 / 4000');
    expect(root.querySelector('[data-remaining]')?.textContent).toBe('50 more characters to say what you think of it');

    await type(`${words}\n\n${page.url}`);

    expect(root.querySelector('[data-remaining]')).toBeNull();
    expect(commit()?.disabled).toBe(false);
  });

  it('says it is committed, links the commit, and closes after about two seconds', async () => {
    const committed = {
      id: 'c1',
      short_hash: 'abc1234',
      body: `${words}\n\n${page.url}`,
      parent_id: null,
      status: 'approved',
      html_url: 'https://dev-null.sh/@jubianchi/commits/c1',
      created_at: '2026-11-05T10:00:00Z',
      author: viewer,
    };
    ask.mockImplementation(async (request: { type: string }) => {
      if (request.type === 'session') return viewer;
      return request.type === 'commit' ? committed : null;
    });
    const onDone = vi.fn();
    await act(async () => {
      render(<PopupComposer page={page} onDone={onDone} />, root);
    });
    await act(async () => {});
    await act(async () => {});
    await type(`${words}\n\n${page.url}`);

    vi.useFakeTimers();
    try {
      await act(async () => commit()?.click());
      await act(async () => {});

      const status = root.querySelector('[role="status"]');
      expect(status?.textContent).toContain('Committed');
      expect(status?.textContent).toContain('Closing…');
      expect(root.querySelector<HTMLAnchorElement>('a[href="https://dev-null.sh/@jubianchi/commits/c1"]')?.textContent).toBe('View the commit');

      await act(async () => {
        vi.advanceTimersByTime(1999);
      });
      expect(onDone).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onDone).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('commits what the user wrote about the page, and says so', async () => {
    const committed = {
      id: 'c1',
      short_hash: 'abc1234',
      body: `${words}\n\n${page.url}`,
      parent_id: null,
      status: 'approved',
      html_url: 'https://dev-null.sh/@jubianchi/commits/c1',
      created_at: '2026-11-05T10:00:00Z',
      author: viewer,
    };
    ask.mockImplementation(async (request: { type: string }) => {
      if (request.type === 'session') return viewer;
      return request.type === 'commit' ? committed : null;
    });
    await show();
    await type(`${words}\n\n${page.url}`);
    await act(async () => commit()?.click());
    await act(async () => {});

    expect(ask).toHaveBeenCalledWith({ type: 'commit', body: `${words}\n\n${page.url}` });
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Committed');
  });

  it('warns about a page that looks private, without blocking', async () => {
    await act(async () => {
      render(<PopupComposer page={{ url: 'http://192.168.1.145:8080/', title: 'NAS' }} />, root);
    });
    await act(async () => {});
    await act(async () => {});

    expect(root.querySelector('[data-privacy]')?.textContent).toBe('This page looks private (192.168.1.145): others may not be able to open it.');
  });

  it('says nothing of a public page', async () => {
    await show();

    expect(root.querySelector('[data-privacy]')).toBeNull();
  });

  it('warns when the link is removed, with a way to insert it again', async () => {
    await show();
    await type(words);

    expect(root.textContent).toContain("This commit doesn't share the page.");
  });
});
