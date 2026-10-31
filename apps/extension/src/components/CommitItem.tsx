import { type Commit, type DeletedCommit, isDeleted } from '@devnull-github/client';
import { segmentBody } from '../lib/segments.ts';
import { relativeTime } from '../lib/time.ts';
import { CommitImages } from './CommitImages.tsx';
import { ACTION, FoldedBody, Star, laneColor, plural } from './CommitParts.tsx';
import { LinkPreview } from './LinkPreview.tsx';
import { Octicon } from './Octicon.tsx';
import { QuotedCommit } from './QuotedCommit.tsx';
import { Replies } from './Replies.tsx';

export function CommitItem({ commit }: { commit: Commit }) {
  return (
    <li class="flex gap-3 border-b border-border-muted px-4 py-3 last:border-b-0">
      <span class="w-0.5 shrink-0 self-stretch rounded-full" style={{ background: laneColor(commit.author) }} aria-hidden="true" />
      <img src={commit.author.avatar_url ?? ''} alt="" class="size-8 shrink-0 rounded-full" loading="lazy" />
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm">
          <a href={commit.author.html_url} class="font-semibold text-fg hover:text-fg-accent hover:underline" target="_blank" rel="noopener">
            {commit.author.name ?? commit.author.handle}
          </a>
          <span class="text-fg-muted">@{commit.author.handle}</span>
          <span class="text-fg-muted">•</span>
          <a href={commit.html_url} class="text-fg-muted hover:text-fg-accent hover:underline" target="_blank" rel="noopener">
            <time dateTime={commit.created_at} title={new Date(commit.created_at).toLocaleString()}>
              {relativeTime(commit.created_at)}
            </time>
          </a>
          <code class="ml-auto font-mono text-xs text-fg-muted">{commit.short_hash}</code>
        </div>
        {commit.parent_id && commit.parent !== undefined && <ReplyingTo parent={commit.parent} />}
        <FoldedBody
          segments={commit.body_segments ?? segmentBody(commit.body)}
          excerpt={commit.preview_segments ?? null}
          mentions={commit.mentions ?? []}
        />
        <CommitImages images={commit.images ?? []} hash={commit.short_hash} link={commit.html_url} />
        {commit.quoted_commit_id && <QuotedCommit quoted={commit.quoted_commit ?? null} />}
        {commit.link_preview && <LinkPreview preview={commit.link_preview} interactive />}
        <div class="mt-2 flex items-center gap-4 text-xs text-fg-muted">
          {commit.stars_count !== undefined && <Star commit={commit} count={commit.stars_count} />}
          {commit.replies_count !== undefined && (
            <a
              href={commit.html_url}
              target="_blank"
              rel="noopener"
              title="Reply on /dev/null"
              class={ACTION}
              aria-label={plural(commit.replies_count, 'reply', 'replies')}
            >
              <Octicon name="comment" />
              {commit.replies_count}
            </a>
          )}
          <a href={commit.html_url} target="_blank" rel="noopener" title="Quote on /dev/null" class={ACTION}>
            <Octicon name="quote" />
            Quote
          </a>
          {commit.status === 'pending' && <span class="text-fg-attention">Pending review</span>}
        </div>
        {commit.reply_preview && <Replies parent={commit} preview={commit.reply_preview} />}
      </div>
    </li>
  );
}

/** The commit a reply replies to, as one line under its header, as dev-null.sh does rather than the parent's card. */
function ReplyingTo({ parent }: { parent: Commit | DeletedCommit | null }) {
  if (parent === null || isDeleted(parent)) {
    return (
      <p class="m-0 mb-1 text-xs text-fg-muted">
        ↳ replying to <span class="font-mono">[{parent === null ? 'unavailable' : 'deleted'}]</span>
      </p>
    );
  }

  return (
    <a href={parent.html_url} target="_blank" rel="noopener" class="mb-1 block text-xs text-fg-muted hover:text-fg-accent hover:underline">
      ↳ replying to @{parent.author.handle}
    </a>
  );
}

