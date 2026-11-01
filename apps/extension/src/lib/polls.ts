import type { Poll } from '@dev-null-ext/client';

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
