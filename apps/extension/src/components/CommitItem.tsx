import type { BodyMention, BodySegment, Commit } from '@devnull-github/client';
import { useState } from 'preact/hooks';
import { segmentBody } from '../lib/segments.ts';
import { relativeTime } from '../lib/time.ts';
import { CommitBody } from './CommitBody.tsx';
import { CommitImages } from './CommitImages.tsx';
import { Octicon } from './Octicon.tsx';
import { QuotedCommit } from './QuotedCommit.tsx';

const LANES = ['bg-lane-0', 'bg-lane-1', 'bg-lane-2', 'bg-lane-3', 'bg-lane-4', 'bg-lane-5'];

/** The author's lane, when the API says (signed requests): an index into the six lanes, or a custom colour. */
function lane(commit: Commit): { class: string; style?: string } {
  const value = (commit.author as { lane?: number | string }).lane;
  if (typeof value === 'number') return { class: LANES[value % LANES.length] ?? 'bg-border' };
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return { class: '', style: `background:${value}` };
  return { class: 'bg-border' };
}

/**
 * The body as dev-null.sh shows it in a list (FoldedCommitBody): its excerpt when it has one, and Show more to unfold
 * it in place, for good.
 */
function FoldedBody({ segments, excerpt, mentions }: { segments: BodySegment[]; excerpt: BodySegment[] | null; mentions: BodyMention[] }) {
  const [unfolded, setUnfolded] = useState(false);
  const folded = excerpt !== null && !unfolded;

  return (
    <>
      <CommitBody segments={folded ? excerpt : segments} mentions={mentions} />
      {folded && (
        <button type="button" onClick={() => setUnfolded(true)} class="mt-0.5 text-sm font-medium text-fg-accent hover:underline">
          Show more
        </button>
      )}
    </>
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function CommitItem({ commit }: { commit: Commit }) {
  const rail = lane(commit);

  return (
    <li class="flex gap-3 border-b border-border-muted px-4 py-3 last:border-b-0">
      <span class={`w-0.5 shrink-0 self-stretch rounded-full ${rail.class}`} style={rail.style} aria-hidden="true" />
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
        <FoldedBody
          segments={commit.body_segments ?? segmentBody(commit.body)}
          excerpt={commit.preview_segments ?? null}
          mentions={commit.mentions ?? []}
        />
        <CommitImages images={commit.images ?? []} hash={commit.short_hash} link={commit.html_url} />
        {commit.quoted_commit_id && <QuotedCommit quoted={commit.quoted_commit ?? null} />}
        <div class="mt-2 flex gap-4 text-xs text-fg-muted">
          {commit.stars_count !== undefined && (
            <span class="inline-flex items-center gap-1" aria-label={plural(commit.stars_count, 'star', 'stars')}>
              <Octicon name={commit.starred ? 'star-fill' : 'star'} class={commit.starred ? 'text-fg-attention' : ''} />
              {commit.stars_count}
            </span>
          )}
          {commit.replies_count !== undefined && (
            <span class="inline-flex items-center gap-1" aria-label={plural(commit.replies_count, 'reply', 'replies')}>
              <Octicon name="comment" />
              {commit.replies_count}
            </span>
          )}
          {commit.status === 'pending' && <span class="text-fg-attention">Pending review</span>}
        </div>
      </div>
    </li>
  );
}
