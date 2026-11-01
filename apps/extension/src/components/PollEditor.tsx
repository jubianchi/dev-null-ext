import { POLL_DURATIONS, type PollDuration } from '@dev-null-ext/client';
import { type DraftPoll, DURATION_LABELS, MAX_POLL_OPTION_LENGTH, MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, previewPoll } from '../lib/polls.ts';
import { IMAGES_OR_POLL } from '../lib/use-commit-draft.ts';
import { CommitPoll } from './CommitPoll.tsx';
import { Lucide } from './Lucide.tsx';

/**
 * A composer's poll: its editor, and while previewing, the poll as the log will show it, over the editor kept hidden in
 * place so nothing moves, as dev-null.sh does.
 */
export function ComposerPoll({
  poll,
  previewing,
  onChange,
  onRemove,
  disabled,
}: {
  poll: DraftPoll;
  previewing: boolean;
  onChange: (poll: DraftPoll) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div class="mt-2 grid">
      <PollEditor poll={poll} onChange={onChange} onRemove={onRemove} disabled={disabled} class={`col-start-1 row-start-1 ${previewing ? 'invisible' : ''}`} />
      {previewing && (
        <div data-poll-preview class="col-start-1 row-start-1 [&>div]:mt-0">
          <CommitPoll poll={previewPoll(poll)} />
        </div>
      )}
    </div>
  );
}

/** The composer toolbar's button to add a poll, turned off by images, as dev-null.sh's. */
export function PollTool({ draft, class: className }: { draft: { canPoll: boolean; images: readonly unknown[]; startPoll: () => void }; class: string }) {
  return (
    <button
      type="button"
      onClick={draft.startPoll}
      disabled={!draft.canPoll}
      aria-label="Add poll"
      title={draft.images.length > 0 ? IMAGES_OR_POLL : 'Add a poll: 2 to 4 options'}
      class={className}
    >
      <Lucide name="chart-bar" />
    </button>
  );
}

const QUIET = 'cursor-pointer rounded-md border-0 bg-transparent text-xs font-medium hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-50';

/**
 * A poll being written, as dev-null.sh's poll editor: one-line options of 50 characters at most, 2 to 4 of them, how
 * long it lasts, and the way to remove it.
 */
export function PollEditor({
  poll,
  onChange,
  onRemove,
  disabled = false,
  class: className = '',
}: {
  poll: DraftPoll;
  onChange: (poll: DraftPoll) => void;
  onRemove: () => void;
  disabled?: boolean;
  class?: string;
}) {
  const setOption = (index: number, value: string) => onChange({ ...poll, options: poll.options.map((option, at) => (at === index ? value : option)) });

  return (
    <fieldset disabled={disabled} class={`m-0 flex min-w-0 flex-col gap-2 rounded-lg border border-solid border-border p-3 ${className}`}>
      <legend class="sr-only">Poll</legend>
      {poll.options.map((option, index) => (
        <div key={index} class="flex items-center gap-2">
          <textarea
            value={option}
            rows={1}
            maxLength={MAX_POLL_OPTION_LENGTH}
            placeholder={`Option ${index + 1}`}
            aria-label={`Option ${index + 1}`}
            onInput={(event) => setOption(index, event.currentTarget.value.replace(/\r?\n/g, ' '))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) event.preventDefault();
            }}
            class="block h-8 w-full min-w-0 resize-none overflow-hidden rounded-md border border-solid border-border bg-canvas px-3 py-1 text-sm leading-[22px] text-fg placeholder:text-fg-muted focus:outline-2 focus:outline-fg-accent"
          />
          {index >= MIN_POLL_OPTIONS && (
            <button
              type="button"
              aria-label={`Remove option ${index + 1}`}
              title="Remove option"
              onClick={() => onChange({ ...poll, options: poll.options.filter((_, at) => at !== index) })}
              class={`${QUIET} shrink-0 p-1.5 text-fg-muted hover:text-fg`}
            >
              <Lucide name="x" />
            </button>
          )}
        </div>
      ))}
      {poll.options.length < MAX_POLL_OPTIONS && (
        <button type="button" onClick={() => onChange({ ...poll, options: [...poll.options, ''] })} class={`${QUIET} self-start px-2 py-1 text-fg-accent`}>
          + Add option
        </button>
      )}
      <div class="flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-border-muted pt-2">
        <label class="flex items-center gap-2 text-xs text-fg-muted">
          Poll length
          <span class="relative">
            <select
              onChange={(event) => onChange({ ...poll, duration: Number(event.currentTarget.value) as PollDuration })}
              class="h-7 appearance-none rounded-md border border-solid border-border bg-canvas pr-7 pl-2 text-xs text-fg"
            >
              {POLL_DURATIONS.map((duration) => (
                <option key={duration} value={duration} selected={duration === poll.duration}>
                  {DURATION_LABELS[duration]}
                </option>
              ))}
            </select>
            <Lucide name="chevron-down" class="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2" />
          </span>
        </label>
        <button type="button" onClick={onRemove} class={`${QUIET} px-2 py-1 text-fg-muted hover:text-fg-danger`}>
          Remove poll
        </button>
      </div>
    </fieldset>
  );
}
