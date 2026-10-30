import type { Commit } from '@devnull-github/client';
import { relativeTime } from '../lib/time.ts';

const LANES = ['bg-lane-0', 'bg-lane-1', 'bg-lane-2', 'bg-lane-3', 'bg-lane-4', 'bg-lane-5'];

/** The author's lane, when the API says (signed requests): an index into the six lanes, or a custom colour. */
function lane(commit: Commit): { class: string; style?: string } {
  const value = (commit.author as { lane?: number | string }).lane;
  if (typeof value === 'number') return { class: LANES[value % LANES.length] ?? 'bg-border' };
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return { class: '', style: `background:${value}` };
  return { class: 'bg-border' };
}

const URL_PATTERN = /(https?:\/\/[^\s<>]+)/g;

/** Plain text with its links clickable. Never HTML from the API. */
function Body({ text }: { text: string }) {
  return (
    <p class="m-0 whitespace-pre-wrap break-words text-sm leading-normal text-fg">
      {text.split(URL_PATTERN).map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={part} class="text-fg-accent hover:underline" target="_blank" rel="noopener noreferrer">
            {part.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
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
          <a href={commit.html_url} class="text-fg-muted hover:text-fg-accent hover:underline" target="_blank" rel="noopener">
            <time dateTime={commit.created_at} title={new Date(commit.created_at).toLocaleString()}>
              {relativeTime(commit.created_at)}
            </time>
          </a>
          <code class="ml-auto font-mono text-xs text-fg-muted">{commit.short_hash}</code>
        </div>
        <Body text={commit.body} />
        <div class="mt-2 flex gap-4 text-xs text-fg-muted">
          {commit.replies_count !== undefined && <span>{commit.replies_count} replies</span>}
          {commit.stars_count !== undefined && <span>{commit.stars_count} stars</span>}
          {commit.status === 'pending' && <span class="text-fg-attention">Pending review</span>}
        </div>
      </div>
    </li>
  );
}
