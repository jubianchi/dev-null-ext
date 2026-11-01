import { type Commit, type DeletedCommit, isDeleted } from '@dev-null-ext/client';
import { segmentBody } from '../lib/segments.ts';
import { relativeTime } from '../lib/time.ts';
import { Avatar } from './Avatar.tsx';
import { CommitBody } from './CommitBody.tsx';
import { CommitImages } from './CommitImages.tsx';
import { CommitPoll } from './CommitPoll.tsx';
import { LinkPreview } from './LinkPreview.tsx';

/**
 * The commit a commit quotes, as dev-null.sh draws it (QuotedCommit): one card linking to it, its author and time,
 * and its body static and capped, fading out. Or why it can't be shown.
 */
export function QuotedCommit({ quoted }: { quoted: Commit | DeletedCommit | null }) {
  if (quoted === null || isDeleted(quoted)) {
    const [tag, message] = quoted === null ? ['unavailable', "This commit isn't available."] : ['deleted', 'This commit was deleted.'];

    return (
      <p class="m-0 mt-2 flex items-baseline gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-fg-muted">
        <span class="font-mono text-xs">[{tag}]</span>
        {message}
      </p>
    );
  }

  return (
    <a href={quoted.html_url} target="_blank" rel="noopener" class="mt-2 block rounded-lg border border-border px-3 py-2 text-fg hover:bg-canvas-muted">
      <div class="mb-1 flex min-w-0 items-baseline gap-1.5 text-sm">
        <span class="sr-only">Quoting</span>
        <Avatar person={quoted.author} size={20} class="self-center" />
        <span class="truncate font-semibold">{quoted.author.name ?? quoted.author.handle}</span>
        <span class="font-mono text-xs text-fg-muted">@{quoted.author.handle}</span>
        <span class="text-fg-muted">·</span>
        <time dateTime={quoted.created_at} title={new Date(quoted.created_at).toLocaleString()} class="text-fg-muted">
          {relativeTime(quoted.created_at)}
        </time>
      </div>
      <div class="max-h-60 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
        <CommitBody
          segments={quoted.preview_segments ?? quoted.body_segments ?? segmentBody(quoted.body)}
          mentions={quoted.mentions ?? []}
          interactive={false}
        />
      </div>
      <CommitImages images={quoted.images ?? []} hash={quoted.short_hash} link={null} />
      {quoted.poll && <CommitPoll poll={quoted.poll} interactive={false} />}
      {quoted.link_preview && <LinkPreview preview={quoted.link_preview} interactive={false} />}
    </a>
  );
}
