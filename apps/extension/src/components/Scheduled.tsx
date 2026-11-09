import type { ScheduledCommit } from '@dev-null-ext/client';
import { SCHEDULED_COMMITS_URL, scheduleLabel } from '../lib/schedule.ts';
import { Octicon } from './Octicon.tsx';

/**
 * What a composer shows once a commit is scheduled, as dev-null.sh's toast says it: for when, that only the user sees
 * it until then, and where it waits with the others.
 */
export function Scheduled({ scheduled, onWriteAnother }: { scheduled: ScheduledCommit; onWriteAnother?: () => void }) {
  return (
    <div class="flex flex-col gap-4">
      <div role="status" class="flex items-start gap-3">
        <span class="mt-0.5 size-5 shrink-0 text-fg-success">
          <Octicon name="check-circle-fill" class="size-5" />
        </span>
        <div>
          <p class="m-0 text-base font-semibold">Commit scheduled</p>
          <p class="m-0 text-sm text-fg-muted">For {scheduleLabel(new Date(scheduled.scheduled_at))}. Only you can see it until it is submitted.</p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2">
        {onWriteAnother && (
          <button
            type="button"
            onClick={onWriteAnother}
            class="h-8 cursor-pointer rounded-md border border-solid border-button-border bg-button px-3 text-sm font-medium text-fg hover:bg-button-hover"
          >
            Write another
          </button>
        )}
        <a
          href={SCHEDULED_COMMITS_URL}
          target="_blank"
          rel="noopener"
          class="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-fg no-underline hover:bg-primary-hover"
        >
          Scheduled commits
          <Octicon name="link-external" />
        </a>
      </div>
    </div>
  );
}
