// @vitest-environment happy-dom
import type { Poll } from '@dev-null-ext/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommitPoll } from '../src/components/CommitPoll.tsx';

const now = new Date('2026-11-01T10:00:00Z');

const hidden: Poll = {
  id: 'p1',
  closes_at: '2026-11-03T10:00:00Z',
  is_closed: false,
  has_voted: false,
  total_votes: null,
  options: [
    { id: 'o1', label: 'Tabs', votes_count: null, voted: false, percentage: null },
    { id: 'o2', label: 'Spaces', votes_count: null, voted: false, percentage: null },
  ],
};

const voted: Poll = {
  ...hidden,
  has_voted: true,
  total_votes: 3,
  options: [
    { id: 'o1', label: 'Tabs', votes_count: 2, voted: true, percentage: 67 },
    { id: 'o2', label: 'Spaces', votes_count: 1, voted: false, percentage: 33 },
  ],
};

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(poll: Poll) {
  await act(async () => {
    render(<CommitPoll poll={poll} now={now} />, root);
  });
}

const options = () => [...root.querySelectorAll('li')];

describe('CommitPoll', () => {
  it('lists the options and the time left while its results are hidden', async () => {
    await show(hidden);

    expect(options().map((option) => option.textContent)).toEqual(['Tabs', 'Spaces']);
    expect(root.textContent).not.toContain('%');
    expect(root.textContent).toContain('2d left');
  });

  it('shows the results as bars, with the share of each option and the viewer’s vote', async () => {
    await show(voted);

    const [tabs, spaces] = options();
    expect(tabs?.textContent).toBe('Tabs, your vote67%');
    expect(spaces?.textContent).toBe('Spaces33%');
    expect(tabs?.querySelector<HTMLElement>('[data-bar]')?.style.width).toBe('67%');
    expect(tabs?.querySelector('[title="2 votes"]')?.textContent).toBe('67%');
    expect(spaces?.querySelector('[title="1 vote"]')).not.toBeNull();
    expect(root.querySelector('[role="status"]')?.textContent).toBe('3 votes · 2d left');
  });

  it('gives the final results once closed', async () => {
    await show({ ...voted, closes_at: '2026-11-01T09:00:00Z', is_closed: true });

    expect(root.querySelector('[role="status"]')?.textContent).toBe('3 votes · Final results');
  });

  it('waits for the commit to be approved', async () => {
    await show({ ...hidden, closes_at: null });

    expect(root.textContent).toContain('Voting opens once approved');
  });
});
