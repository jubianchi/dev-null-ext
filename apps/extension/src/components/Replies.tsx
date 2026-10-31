import { type Commit, type DeletedCommit, isDeleted } from '@dev-null-ext/client';
import { useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import { segmentBody } from '../lib/segments.ts';
import { relativeTime } from '../lib/time.ts';
import { CommitImages } from './CommitImages.tsx';
import { ACTION, FoldedBody, laneColor, plural, Star } from './CommitParts.tsx';
import { LinkPreview } from './LinkPreview.tsx';

type Reply = Commit | DeletedCommit;

/**
 * A commit's replies under it, as dev-null.sh opens them in a list: the newest one the API previews, and the older
 * ones on demand, newest first, each hanging from a dashed line in its author's lane.
 */
export function Replies({ parent, preview }: { parent: Commit; preview: { data: Reply[]; next_cursor: string | null } }) {
  const [replies, setReplies] = useState(preview.data);
  const [cursor, setCursor] = useState(preview.next_cursor);
  const [loading, setLoading] = useState(false);

  const left = Math.max(0, (parent.replies_count ?? replies.length) - replies.length);

  async function more() {
    setLoading(true);
    try {
      const page = await ask({ type: 'replies', commitId: parent.id, cursor });
      setReplies((current) => [...current, ...page.data]);
      setCursor(page.meta.next_cursor);
    } finally {
      setLoading(false);
    }
  }

  if (replies.length === 0) return null;

  return (
    <div class="mt-2">
      {replies.map((reply) => (
        <ReplyItem key={reply.id} reply={reply} parentId={parent.id} />
      ))}
      {cursor && left > 0 && (
        <button
          type="button"
          onClick={() => void more()}
          disabled={loading}
          class="ml-1 mt-1 border-0 border-l-2 border-dashed border-border bg-transparent py-1 pl-3 text-xs font-medium text-fg-accent hover:underline disabled:opacity-50"
        >
          {moreLabel(left)}
        </button>
      )}
    </div>
  );
}

/** The API pages replies 50 at a time (CommitRepliesQuery::PER_PAGE). */
const REPLIES_PER_PAGE = 50;

/** As dev-null.sh words it (moreRepliesLabel): the last ones when one page loads them all, how many more otherwise. */
function moreLabel(left: number): string {
  if (left === 1) return 'Show the last reply';
  return left <= REPLIES_PER_PAGE ? `Show the last ${left}` : `Show ${left} more`;
}

/** A reply, or a quote of the parent: dev-null.sh lists both under a commit, and marks the quotes. */
function ReplyItem({ reply, parentId }: { reply: Reply; parentId: string }) {
  if (isDeleted(reply)) {
    return (
      <div data-reply class="ml-1 border-l-2 border-dashed border-border py-2 pl-3 text-sm text-fg-muted">
        <span class="font-mono text-xs">[deleted]</span> This commit was deleted.
      </div>
    );
  }

  const quotes = reply.quoted_commit_id === parentId;

  return (
    <div data-reply class="ml-1 flex gap-2 border-l-2 border-dashed py-2 pl-3" style={{ borderColor: laneColor(reply.author) }}>
      {reply.author.avatar_url ? (
        <img src={reply.author.avatar_url} alt="" class="size-6 shrink-0 rounded-full" loading="lazy" />
      ) : (
        <span class="size-6 shrink-0 rounded-full bg-canvas-muted" aria-hidden="true" />
      )}
      <div class="min-w-0 flex-1">
        <div class="mb-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <a href={reply.author.html_url} target="_blank" rel="noopener" class="font-semibold text-fg hover:text-fg-accent hover:underline">
            {reply.author.name ?? reply.author.handle}
          </a>
          <span class="text-fg-muted">@{reply.author.handle}</span>
          {quotes && <span class="text-xs text-fg-accent">quoted</span>}
          <span class="text-fg-muted">•</span>
          <a href={reply.html_url} target="_blank" rel="noopener" class="text-fg-muted hover:text-fg-accent hover:underline">
            <time dateTime={reply.created_at} title={new Date(reply.created_at).toLocaleString()}>
              {relativeTime(reply.created_at)}
            </time>
          </a>
        </div>
        <FoldedBody segments={reply.body_segments ?? segmentBody(reply.body)} excerpt={reply.preview_segments ?? null} mentions={reply.mentions ?? []} />
        <CommitImages images={reply.images ?? []} hash={reply.short_hash} link={reply.html_url} />
        {reply.link_preview && <LinkPreview preview={reply.link_preview} interactive />}
        <div class="mt-1 flex items-center gap-4 text-xs text-fg-muted">
          {reply.stars_count !== undefined && <Star commit={reply} count={reply.stars_count} />}
          {(reply.replies_count ?? 0) > 0 && (
            <a
              href={reply.html_url}
              target="_blank"
              rel="noopener"
              class={`${ACTION} text-fg-accent`}
              aria-label={plural(reply.replies_count ?? 0, 'reply', 'replies')}
            >
              {plural(reply.replies_count ?? 0, 'reply', 'replies')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
