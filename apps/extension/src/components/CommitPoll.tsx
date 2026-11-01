import type { Poll } from '@dev-null-ext/client';
import { pollStatus, showsResults, voteCount } from '../lib/polls.ts';
import { Lucide } from './Lucide.tsx';

const OPTION = 'rounded-md border border-solid border-border px-3 py-2 text-sm [overflow-wrap:anywhere]';
const STATUS = 'm-0 mt-2 font-mono text-xs text-fg-muted';

/**
 * A commit's poll, as dev-null.sh's commit-poll: its options while the results are hidden, then a bar per option with
 * its share, the viewer's vote checked, and the votes with the time left.
 */
export function CommitPoll({ poll, now = new Date() }: { poll: Poll; now?: Date }) {
  const status = pollStatus(poll, now);

  if (!showsResults(poll)) {
    return (
      <div class="mt-3">
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          {poll.options.map((option) => (
            <li key={option.id} class={OPTION}>
              {option.label}
            </li>
          ))}
        </ul>
        <p class={STATUS}>{status}</p>
      </div>
    );
  }

  return (
    <div class="mt-3">
      <ul class="m-0 flex list-none flex-col gap-2 p-0">
        {poll.options.map((option) => {
          const share = option.percentage ?? 0;
          return (
            <li key={option.id} class={`relative overflow-hidden ${OPTION}`}>
              <span
                data-bar
                aria-hidden="true"
                class={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out motion-reduce:transition-none ${option.voted ? 'bg-fg-accent/15' : 'bg-canvas-muted'}`}
                style={{ width: `${share}%` }}
              />
              <span class="relative flex items-center gap-2">
                <span class={`min-w-0 flex-1 ${option.voted ? 'font-medium' : ''}`}>
                  {option.label}
                  {option.voted && (
                    <>
                      <Lucide name="check" class="ml-1.5 inline size-4 align-[-2px] text-fg-accent" />
                      <span class="sr-only">, your vote</span>
                    </>
                  )}
                </span>
                <span title={voteCount(option.votes_count ?? 0)} class="shrink-0 font-mono text-xs tabular-nums">
                  {share}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p role="status" class={STATUS}>
        {voteCount(poll.total_votes)} · {status}
      </p>
    </div>
  );
}
