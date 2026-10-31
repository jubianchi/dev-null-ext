import type { BodyMention, BodySegment, Commit, DeletedCommit } from '@devnull-github/client';
import { useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import { segmentBody } from '../lib/segments.ts';
import { relativeTime } from '../lib/time.ts';
import { CommitBody } from './CommitBody.tsx';
import { CommitImages } from './CommitImages.tsx';
import { LinkPreview } from './LinkPreview.tsx';
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
      </div>
    </li>
  );
}

/** The commit a reply replies to, as one line under its header, as dev-null.sh does rather than the parent's card. */
function ReplyingTo({ parent }: { parent: Commit | DeletedCommit | null }) {
  if (parent === null || 'deleted_at' in parent) {
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

const ACTION ='inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-fg-muted hover:bg-canvas-muted hover:text-fg-accent';

/** The star counter, which stars and unstars the commit: at once, and back as it was if /dev/null refuses. */
function Star({ commit, count }: { commit: Commit; count: number }) {
  const [state, setState] = useState({ starred: commit.starred ?? false, count });

  function toggle() {
    const previous = state;
    const starred = !previous.starred;
    setState({ starred, count: previous.count + (starred ? 1 : -1) });
    ask({ type: 'star', commitId: commit.id, starred }).catch(() => setState(previous));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.starred}
      aria-label={plural(state.count, 'star', 'stars')}
      title={state.starred ? 'Unstar' : 'Star'}
      class={`${ACTION} cursor-pointer border-0 bg-transparent font-[inherit]`}
    >
      <Octicon name={state.starred ? 'star-fill' : 'star'} class={state.starred ? 'text-fg-attention' : ''} />
      {state.count}
    </button>
  );
}
