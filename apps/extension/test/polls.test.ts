import type { Poll } from '@dev-null-ext/client';
import { describe, expect, it } from 'vitest';
import { pollStatus, voteCount } from '../src/lib/polls.ts';

const now = new Date('2026-11-01T10:00:00Z');

const poll = (closes_at: string | null, results = true, is_closed = false): Poll => ({
  id: 'p1',
  closes_at,
  is_closed,
  has_voted: results,
  total_votes: results ? 3 : null,
  options: [],
});

describe('pollStatus', () => {
  it('waits for the approval before the poll opens', () => {
    expect(pollStatus(poll(null), now)).toBe('Voting opens once approved');
  });

  it('tells the time left, rounded up to the minute, in the largest whole unit', () => {
    expect(pollStatus(poll('2026-11-04T09:00:00Z'), now)).toBe('2d left');
    expect(pollStatus(poll('2026-11-02T10:00:00Z'), now)).toBe('1d left');
    expect(pollStatus(poll('2026-11-01T15:59:00Z'), now)).toBe('5h left');
    expect(pollStatus(poll('2026-11-01T10:12:01Z'), now)).toBe('13m left');
    expect(pollStatus(poll('2026-11-01T10:00:01Z'), now)).toBe('1m left');
  });

  it('gives the final results once closed, or only says so while they are hidden', () => {
    expect(pollStatus(poll('2026-11-01T09:00:00Z'), now)).toBe('Final results');
    expect(pollStatus(poll('2026-11-01T09:00:00Z', false), now)).toBe('Poll closed');
    expect(pollStatus(poll('2026-11-05T09:00:00Z', true, true), now)).toBe('Final results');
  });
});

describe('voteCount', () => {
  it('counts votes as dev-null.sh does, compact from 10,000', () => {
    expect(voteCount(1)).toBe('1 vote');
    expect(voteCount(0)).toBe('0 votes');
    expect(voteCount(1250)).toBe('1,250 votes');
    expect(voteCount(10_240)).toBe('10.2k votes');
  });
});
