import type { NewPoll, Poll, PollDuration } from '@dev-null-ext/client';

/** A poll being written: its options as typed. */
export type DraftPoll = NewPoll;

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 4;
export const MAX_POLL_OPTION_LENGTH = 50;

export const DURATION_LABELS: Record<PollDuration, string> = { 60: '1 hour', 1440: '1 day', 4320: '3 days', 10080: '7 days' };

/** As dev-null.sh's poll editor starts: two empty options, for a day. */
export function newPoll(): DraftPoll {
  return { options: ['', ''], duration: 1440 };
}

/**
 * A poll being written as the composer previews it, as dev-null.sh does: its filled options, trimmed, and not open yet,
 * since a commit opens its poll once approved.
 */
export function previewPoll(poll: DraftPoll): Poll {
  const labels = poll.options.map((option) => option.trim()).filter((option) => option !== '');
  return {
    id: '',
    closes_at: null,
    is_closed: false,
    has_voted: false,
    total_votes: null,
    options: labels.map((label, index) => ({ id: String(index), label, votes_count: null, voted: false, percentage: null })),
  };
}

export function pollReady(poll: DraftPoll): boolean {
  return poll.options.every((option) => option.trim() !== '');
}

/** /dev/null hides a poll's results until the viewer votes, unless the poll is theirs or closed. */
export function showsResults(poll: Poll): poll is Poll & { total_votes: number } {
  return poll.total_votes !== null;
}

export function isOpen(poll: Poll, now: Date = new Date()): boolean {
  return poll.closes_at !== null && !poll.is_closed && Date.parse(poll.closes_at) > now.getTime();
}

/** As dev-null.sh's commit-poll tells where a poll stands: the time left, rounded up to the minute, or that it closed. */
export function pollStatus(poll: Poll, now: Date = new Date()): string {
  if (poll.closes_at === null) return 'Voting opens once approved';
  if (!isOpen(poll, now)) return showsResults(poll) ? 'Final results' : 'Poll closed';

  const minutes = Math.ceil((Date.parse(poll.closes_at) - now.getTime()) / 60_000);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d left`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h left`;
  return `${Math.max(minutes, 1)}m left`;
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function voteCount(count: number): string {
  const number = count < 10_000 ? count.toLocaleString('en-US') : compact.format(count).toLowerCase();
  return `${number} ${count === 1 ? 'vote' : 'votes'}`;
}
