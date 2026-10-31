// @vitest-environment happy-dom
import type { Commit } from '@devnull-github/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommitItem } from '../src/components/CommitItem.tsx';

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
  root = document.createElement('ul');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

const counter = (label: RegExp) => [...root.querySelectorAll('[aria-label]')].find((element) => label.test(element.getAttribute('aria-label') ?? ''));

describe('CommitItem', () => {
  it("shows replies and stars as GitHub does: an octicon and the count", () => {
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

  it('falls back to the raw body when it is not segmented (signed out)', () => {
    render(<CommitItem commit={{ ...commit, body: 'see https://example.com' }} />, root);

    expect(root.querySelector('a[href="https://example.com"]')).not.toBeNull();
  });

  it('fills the star of a commit the user starred', () => {
    render(<CommitItem commit={{ ...commit, starred: true }} />, root);

    expect(counter(/star/)?.querySelector('svg.octicon-star-fill')).not.toBeNull();
  });
});
