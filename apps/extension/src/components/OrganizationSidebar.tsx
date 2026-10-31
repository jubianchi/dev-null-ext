import type { Commit } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import { relativeTime } from '../lib/time.ts';
import { useSession } from '../lib/use-session.ts';
import { Glyph } from './Glyph.tsx';

const LATEST = 3;

/**
 * What /dev/null says of the organization, as a section of the sidebar of its discussions list, drawn as GitHub's own
 * sections there: the latest commits mentioning it, and the way to its /dev/null tab. Only when connected to
 * /dev/null, as the tab's log.
 */
export function OrganizationSidebar({ organization }: { organization: string }) {
  const user = useSession();
  const [commits, setCommits] = useState<Commit[] | null>(null);

  useEffect(() => {
    if (!user) return;
    ask({ type: 'mentions', organization, cursor: null }).then(
      (page) => setCommits(page.data.slice(0, LATEST)),
      () => setCommits([]),
    );
  }, [organization, user]);

  if (!user || commits === null) return null;

  return (
    <section class="mt-4 font-sans text-fg">
      <div class="mb-3 flex items-center gap-2 border-0 border-b border-solid border-border pb-2">
        <Glyph class="size-4" />
        <h2 class="m-0 flex-auto text-sm font-semibold">On /dev/null</h2>
      </div>

      {commits.length === 0 ? (
        <p class="m-0 mb-2 text-xs text-fg-muted">No commits mention @{organization} yet.</p>
      ) : (
        <ul class="m-0 mb-2 list-none space-y-3 p-0">
          {commits.map((commit) => (
            <li key={commit.id}>
              <a href={commit.html_url} target="_blank" rel="noopener" class="block text-fg no-underline hover:text-fg-accent">
                <span class="mb-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
                  {commit.author.avatar_url ? (
                    <img src={commit.author.avatar_url} alt="" class="size-4 rounded-full" loading="lazy" />
                  ) : (
                    <span class="size-4 rounded-full bg-canvas-muted" aria-hidden="true" />
                  )}
                  <span class="font-semibold text-fg">@{commit.author.handle}</span>
                  <time dateTime={commit.created_at}>{relativeTime(commit.created_at)}</time>
                </span>
                <span class="line-clamp-2 text-xs">{commit.body.replace(/\s+/g, ' ').trim()}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <a href="#dev-null" class="text-xs text-fg-accent hover:underline">
        All commits mentioning @{organization}
      </a>
    </section>
  );
}
