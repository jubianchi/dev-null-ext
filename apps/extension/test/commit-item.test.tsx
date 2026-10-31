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

const { CommitItem } = await import('../src/components/CommitItem.tsx');

const commit: Commit = {
  id: 'c1',
  short_hash: 'abc1234',
  body: 'Shipped',
  parent_id: null,
  html_url: 'https://dev-null.sh/@jubianchi/commits/c1',
  created_at: '2026-10-30T10:00:00Z',
  replies_count: 1,
  stars_count: 3,
  author: { id: '1', handle: 'jubianchi', name: 'Julien', avatar_url: null, bio: null, github_url: '', html_url: '' },
};

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  ask.mockResolvedValue(null);
  root = document.createElement('ul');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

const counter = (label: RegExp) => [...root.querySelectorAll('[aria-label]')].find((element) => label.test(element.getAttribute('aria-label') ?? ''));

describe('CommitItem', () => {
  it('shows replies and stars as GitHub does: an octicon and the count', () => {
    render(<CommitItem commit={commit} />, root);

    const replies = counter(/repl/);
    const stars = counter(/star/);
    expect(replies?.getAttribute('aria-label')).toBe('1 reply');
    expect(replies?.querySelector('svg.octicon-comment')).not.toBeNull();
    expect(replies?.textContent).toBe('1');
    expect(stars?.getAttribute('aria-label')).toBe('3 stars');
    expect(stars?.querySelector('svg.octicon-star')).not.toBeNull();
    expect(stars?.textContent).toBe('3');
  });

  it('renders the body as /dev/null segmented it, code fences included', () => {
    render(
      <CommitItem
        commit={{
          ...commit,
          body: 'Posted via\n```php title="src/Ollama.php"\necho 1;\n```',
          body_segments: [
            { type: 'text', text: 'Posted via' },
            { type: 'block', language: 'php', filename: 'src/Ollama.php', html: '<span class="hl-keyword">echo</span> 1;' },
          ],
          preview_segments: null,
          mentions: [],
        }}
      />,
      root,
    );

    expect(root.querySelector('figcaption')?.textContent).toBe('src/Ollama.php');
    expect(root.querySelector('pre .hl-keyword')?.textContent).toBe('echo');
    expect(root.textContent).not.toContain('```');
  });

  it('folds a long body to its excerpt, with Show more to unfold it in place', () => {
    render(
      <CommitItem
        commit={{
          ...commit,
          body_segments: [{ type: 'text', text: 'A long story, all of it' }],
          preview_segments: [{ type: 'text', text: 'A long story…' }],
          mentions: [],
        }}
      />,
      root,
    );

    const more = [...root.querySelectorAll('button')].find((button) => button.textContent === 'Show more');
    expect(root.textContent).toContain('A long story…');

    act(() => more?.click());
    expect(root.textContent).toContain('A long story, all of it');
    expect([...root.querySelectorAll('button')].some((button) => button.textContent === 'Show more')).toBe(false);
  });

  it('segments the body itself when /dev/null sends it raw (signed out), without highlighting', () => {
    render(<CommitItem commit={{ ...commit, body: 'see https://example.com\n```php title="a.php"\necho 1;\n```' }} />, root);

    expect(root.querySelector('a[href="https://example.com"]')).not.toBeNull();
    expect(root.querySelector('figcaption')?.textContent).toBe('a.php');
    expect(root.querySelector('pre')?.textContent).toBe('echo 1;');
    expect(root.textContent).not.toContain('```');
  });

  it('shows the quoted commit as a card linking to it, under the body', () => {
    render(
      <CommitItem
        commit={{
          ...commit,
          quoted_commit_id: 'q1',
          quoted_commit: {
            ...commit,
            id: 'q1',
            html_url: 'https://dev-null.sh/@njames/commits/q1',
            author: { ...commit.author, handle: 'njames', name: 'Nigel James' },
            body_segments: [{ type: 'block', language: null, filename: null, html: 'print(1)' }],
            preview_segments: null,
            mentions: [],
          },
        }}
      />,
      root,
    );

    const card = root.querySelector<HTMLAnchorElement>('a[href="https://dev-null.sh/@njames/commits/q1"]');
    expect(card?.textContent).toContain('Quoting');
    expect(card?.textContent).toContain('Nigel James');
    expect(card?.textContent).toContain('@njames');
    expect(card?.querySelector('pre')?.textContent).toBe('print(1)');
    expect(card?.querySelector('a')).toBeNull();
  });

  it('says when the quoted commit was deleted or is not visible', () => {
    render(
      <CommitItem commit={{ ...commit, quoted_commit_id: 'q1', quoted_commit: { id: 'q1', parent_id: null, deleted_at: '2026-10-30T10:00:00Z' } }} />,
      root,
    );
    expect(root.textContent).toContain('This commit was deleted.');

    render(<CommitItem commit={{ ...commit, quoted_commit_id: 'q2', quoted_commit: null }} />, root);
    expect(root.textContent).toContain("This commit isn't available.");
  });

  it('stars and unstars the commit from its star counter, at once', async () => {
    render(<CommitItem commit={commit} />, root);
    const star = root.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
    expect(star.getAttribute('aria-pressed')).toBe('false');

    await act(async () => star.click());
    expect(ask).toHaveBeenLastCalledWith({ type: 'star', commitId: 'c1', starred: true });
    expect(star.getAttribute('aria-pressed')).toBe('true');
    expect(star.getAttribute('aria-label')).toBe('4 stars');
    expect(star.querySelector('svg.octicon-star-fill')).not.toBeNull();

    await act(async () => star.click());
    expect(ask).toHaveBeenLastCalledWith({ type: 'star', commitId: 'c1', starred: false });
    expect(star.getAttribute('aria-label')).toBe('3 stars');
  });

  it('puts the star back as it was when /dev/null refuses it', async () => {
    ask.mockRejectedValueOnce(new Error('offline'));
    render(<CommitItem commit={commit} />, root);
    const star = root.querySelector<HTMLButtonElement>('button[aria-pressed]')!;

    await act(async () => star.click());
    await act(async () => {});

    expect(star.getAttribute('aria-pressed')).toBe('false');
    expect(star.getAttribute('aria-label')).toBe('3 stars');
  });

  it('replies and quotes on /dev/null, from links to the commit', () => {
    render(<CommitItem commit={commit} />, root);

    const reply = root.querySelector('a[aria-label="1 reply"]');
    const quote = [...root.querySelectorAll('a')].find((link) => link.textContent === 'Quote');
    expect(reply?.getAttribute('href')).toBe(commit.html_url);
    expect(quote?.getAttribute('href')).toBe(commit.html_url);
    expect(quote?.querySelector('svg.octicon-quote')).not.toBeNull();
  });

  it('says which commit a reply replies to, linking to it', () => {
    const parent = { ...commit, id: 'p1', html_url: 'https://dev-null.sh/@njames/commits/p1', author: { ...commit.author, handle: 'njames' } };
    render(<CommitItem commit={{ ...commit, parent_id: 'p1', parent }} />, root);

    const link = [...root.querySelectorAll('a')].find((element) => element.textContent?.includes('replying to'));
    expect(link?.textContent).toBe('↳ replying to @njames');
    expect(link?.getAttribute('href')).toBe(parent.html_url);
  });

  it('takes deleted_at: null, which signed requests send on every commit, as a live commit', () => {
    const live = { ...commit, id: 'p1', deleted_at: null, author: { ...commit.author, handle: 'njames' } };
    render(<CommitItem commit={{ ...commit, parent_id: 'p1', parent: live, quoted_commit_id: 'p1', quoted_commit: live }} />, root);

    expect(root.textContent).toContain('↳ replying to @njames');
    expect(root.textContent).toContain('Quoting');
    expect(root.textContent).not.toContain('[deleted]');
  });

  it('says when the parent of a reply was deleted or is not visible', () => {
    render(<CommitItem commit={{ ...commit, parent_id: 'p1', parent: { id: 'p1', parent_id: null, deleted_at: '2026-10-30T10:00:00Z' } }} />, root);
    expect(root.textContent).toContain('↳ replying to [deleted]');

    render(<CommitItem commit={{ ...commit, parent_id: 'p1', parent: null }} />, root);
    expect(root.textContent).toContain('↳ replying to [unavailable]');
  });

  it('fills the star of a commit the user starred', () => {
    render(<CommitItem commit={{ ...commit, starred: true }} />, root);

    expect(counter(/star/)?.querySelector('svg.octicon-star-fill')).not.toBeNull();
  });
});
