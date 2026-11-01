import type { Poll } from '@dev-null-ext/client';
import { useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import { isOpen, pollStatus, showsResults, voteCount } from '../lib/polls.ts';
import { segmentBody } from '../lib/segments.ts';
import { CommitBody } from './CommitBody.tsx';
import { Lucide } from './Lucide.tsx';

const OPTION = 'rounded-md border border-solid border-border px-3 py-2 text-sm [overflow-wrap:anywhere]';
const STATUS = 'm-0 font-mono text-xs text-fg-muted';

/** How the viewer may vote: on which commit, and whether the poll is theirs, which /dev/null refuses. */
export interface PollVote {
  commitId: string;
  own: boolean;
}

/**
 * A commit's poll, as dev-null.sh's commit-poll: its options to pick one from while the results are hidden, then a bar
 * per option with its share, the viewer's vote checked, and the votes with the time left. Without `vote` (a quoted
 * commit), the options are only listed.
 */
export function CommitPoll({
  poll: initial,
  vote,
  now = new Date(),
  interactive = true,
}: {
  poll: Poll;
  vote?: PollVote;
  now?: Date;
  /** False inside a link, such as a quoted commit's card: the options' links are drawn, not clickable. */
  interactive?: boolean;
}) {
  const [poll, setPoll] = useState(initial);
  const status = pollStatus(poll, now);

  if (showsResults(poll)) return <Results poll={poll} status={status} interactive={interactive} />;

  if (!vote) {
    return (
      <div class="mt-3 flex flex-col gap-2">
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          {poll.options.map((option) => (
            <li key={option.id} class={OPTION}>
              <OptionLabel label={option.label} interactive={interactive} />
            </li>
          ))}
        </ul>
        <p class={STATUS}>{status}</p>
      </div>
    );
  }

  return <Ballot poll={poll} vote={vote} status={status} canVote={!vote.own && !poll.has_voted && isOpen(poll, now)} onVoted={setPoll} />;
}

/** An option as dev-null.sh draws it, as a commit's body: its links, GitHub's with their icon, and its inline code. */
function OptionLabel({ label, interactive = true }: { label: string; interactive?: boolean }) {
  return (
    <span class="[&>[data-commit-body]]:inline">
      <CommitBody segments={segmentBody(label)} mentions={[]} interactive={interactive} />
    </span>
  );
}

function Ballot({ poll, vote, status, canVote, onVoted }: { poll: Poll; vote: PollVote; status: string; canVote: boolean; onVoted: (poll: Poll) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: Event) {
    event.preventDefault();
    if (!choice) return;
    setSending(true);
    setError(null);
    try {
      const commit = await ask({ type: 'vote', commitId: vote.commitId, optionId: choice });
      if (commit.poll) onVoted(commit.poll);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not record your vote. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form class="mt-3 flex flex-col gap-2" onSubmit={submit}>
      <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend class="sr-only">Poll options</legend>
        {poll.options.map((option) => (
          <label
            key={option.id}
            class={`flex cursor-pointer items-center gap-3 transition-colors hover:bg-canvas-muted has-checked:border-fg-accent has-checked:bg-fg-accent/10 has-focus-visible:outline-2 has-focus-visible:outline-fg-accent has-disabled:cursor-default has-disabled:hover:bg-transparent ${OPTION}`}
          >
            <input
              type="radio"
              name={`poll-${poll.id}`}
              value={option.id}
              checked={choice === option.id}
              disabled={!canVote || sending}
              onChange={() => setChoice(option.id)}
              class="m-0 size-4 accent-fg-accent"
            />
            <span class="min-w-0">
              <OptionLabel label={option.label} />
            </span>
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" class="m-0 text-xs text-fg-danger">
          {error}
        </p>
      )}
      <div class="flex items-center justify-between gap-3">
        <p class={STATUS}>{status}</p>
        {canVote && (
          <button
            type="submit"
            disabled={!choice || sending}
            class="h-7 cursor-pointer rounded-md border border-solid border-transparent bg-primary px-3 text-xs font-medium text-primary-fg hover:bg-primary-hover disabled:cursor-default disabled:opacity-50"
          >
            {sending ? 'Voting…' : 'Vote'}
          </button>
        )}
      </div>
    </form>
  );
}

function Results({ poll, status, interactive }: { poll: Poll & { total_votes: number }; status: string; interactive: boolean }) {
  return (
    <div class="mt-3 flex flex-col gap-2">
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
                  <OptionLabel label={option.label} interactive={interactive} />
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
