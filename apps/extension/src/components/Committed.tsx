import type { Commit } from '@dev-null-ext/client';
import { segmentBody } from '../lib/segments.ts';
import { Avatar } from './Avatar.tsx';
import { CommitImages } from './CommitImages.tsx';
import { FoldedBody, laneColor } from './CommitParts.tsx';
import { Octicon } from './Octicon.tsx';

/**
 * What the modal composer shows once a commit is sent: that it's done, or waiting for review, the commit as the log will
 * show it, and what to do next: open it on /dev/null, or write another.
 */
export function Committed({ commit, onWriteAnother }: { commit: Commit; onWriteAnother: () => void }) {
  const pending = commit.status === 'pending';

  return (
    <div class="flex flex-col gap-4">
      <div role="status" class="flex items-start gap-3">
        <span class={`mt-0.5 size-5 shrink-0 ${pending ? 'text-fg-attention' : 'text-fg-success'}`}>
          <Octicon name="check-circle-fill" class="size-5" />
        </span>
        <div>
          <p class="m-0 text-base font-semibold">{pending ? 'Committed, awaiting review' : 'Committed to /dev/null'}</p>
          <p class="m-0 text-sm text-fg-muted">{pending ? 'It shows publicly once it passes review.' : 'It is in your log, and in the logs it mentions.'}</p>
        </div>
      </div>

      <article data-committed class="flex gap-3 rounded-lg border border-border bg-canvas-muted p-3">
        <span class="w-0.5 shrink-0 self-stretch rounded-full" style={{ background: laneColor(commit.author) }} aria-hidden="true" />
        <Avatar person={commit.author} size={32} />
        <div class="min-w-0 flex-1 text-sm">
          <div class="mb-1 flex flex-wrap items-baseline gap-x-2">
            <span class="font-semibold">{commit.author.name ?? commit.author.handle}</span>
            <span class="text-fg-muted">@{commit.author.handle}</span>
            <code class="ml-auto font-mono text-xs text-fg-muted">{commit.short_hash}</code>
          </div>
          <FoldedBody segments={commit.body_segments ?? segmentBody(commit.body)} excerpt={commit.preview_segments ?? null} mentions={commit.mentions ?? []} />
          <CommitImages images={commit.images ?? []} hash={commit.short_hash} link={commit.html_url} />
        </div>
      </article>

      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onWriteAnother}
          class="h-8 cursor-pointer rounded-md border border-solid border-button-border bg-button px-3 text-sm font-medium text-fg hover:bg-button-hover"
        >
          Write another
        </button>
        <a
          href={commit.html_url}
          target="_blank"
          rel="noopener"
          class="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-fg no-underline hover:bg-primary-hover"
        >
          View on /dev/null
          <Octicon name="link-external" />
        </a>
      </div>
    </div>
  );
}
