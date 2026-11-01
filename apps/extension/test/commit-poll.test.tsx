// @vitest-environment happy-dom
import type { Poll } from '@dev-null-ext/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({ ask }));

const { CommitPoll } = await import('../src/components/CommitPoll.tsx');

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
  ask.mockReset();
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

describe('CommitPoll, to vote', () => {
  async function showVoting(poll: Poll, own = false) {
    await act(async () => {
      render(<CommitPoll poll={poll} now={now} vote={{ commitId: 'c1', own }} />, root);
    });
  }

  const radios = () => [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  const voteButton = () => [...root.querySelectorAll('button')].find((button) => button.textContent === 'Vote');

  it('picks an option, then votes for it once, and shows the results /dev/null sends back', async () => {
    ask.mockResolvedValue({ id: 'c1', poll: voted });
    await showVoting(hidden);

    expect(radios()).toHaveLength(2);
    expect(voteButton()?.disabled).toBe(true);

    await act(async () => radios()[0]?.click());
    expect(voteButton()?.disabled).toBe(false);

    await act(async () => voteButton()?.click());
    await act(async () => {});

    expect(ask).toHaveBeenCalledWith({ type: 'vote', commitId: 'c1', optionId: 'o1' });
    expect(radios()).toHaveLength(0);
    expect(root.querySelector('[role="status"]')?.textContent).toBe('3 votes · 2d left');
  });

  it('says why /dev/null refused the vote, and lets the user pick again', async () => {
    ask.mockRejectedValue(new Error('This poll has closed.'));
    await showVoting(hidden);

    await act(async () => radios()[1]?.click());
    await act(async () => voteButton()?.click());
    await act(async () => {});

    expect(root.querySelector('[role="alert"]')?.textContent).toBe('This poll has closed.');
    expect(voteButton()?.disabled).toBe(false);
  });

  it("can't vote on one's own poll, nor on a poll not open yet, nor on a closed one", async () => {
    for (const [poll, own] of [
      [hidden, true],
      [{ ...hidden, closes_at: null }, false],
      [{ ...hidden, closes_at: '2026-11-01T09:00:00Z', is_closed: true }, false],
    ] as const) {
      render(null, root);
      await showVoting(poll, own);

      expect(radios().map((radio) => radio.disabled)).toEqual([true, true]);
      expect(voteButton()).toBeUndefined();
    }
  });
});
