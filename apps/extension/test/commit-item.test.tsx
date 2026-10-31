// @vitest-environment happy-dom
import type { Commit } from '@devnull-github/client';
import { render } from 'preact';
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

  it('fills the star of a commit the user starred', () => {
    render(<CommitItem commit={{ ...commit, starred: true }} />, root);

    expect(counter(/star/)?.querySelector('svg.octicon-star-fill')).not.toBeNull();
  });
});
