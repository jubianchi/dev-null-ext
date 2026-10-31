import type { CurrentUser } from '@devnull-github/client';
import type { GitHubPage } from '../lib/github/page.ts';
import { type Settings, shareFeatureFor } from '../lib/settings.ts';
import { shareLabel } from '../lib/share.ts';
import { Octicon } from './Octicon.tsx';

/**
 * The popup when connected, as dev-null.sh's profile card: the user's avatar in a dashed ring, their name and handle,
 * their counts when /dev/null sends them, and the way to their profile; then where to commit about the GitHub page in
 * the current tab.
 */
export function PopupProfile({
  user,
  page,
  settings,
  onDisconnect,
}: {
  user: CurrentUser;
  page: GitHubPage | null;
  settings: Settings;
  onDisconnect: () => void;
}) {
  const counts = [
    [user.commits_count, 'commits'],
    [user.following_count, 'following'],
    [user.followers_count, 'followers'],
  ].filter((count): count is [number, string] => typeof count[0] === 'number');

  return (
    <>
      <section class="mx-3 flex flex-col items-center gap-2.5 rounded-xl border border-solid border-zinc-200 px-4 py-5 text-center">
        <div class="size-[72px] rounded-full border-2 border-dashed border-teal-700 p-[3px]">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" class="size-full rounded-full" />
          ) : (
            <span class="flex size-full items-center justify-center rounded-full bg-zinc-100 text-xl font-semibold text-zinc-600">
              {user.handle.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p class="m-0 text-[17px] font-bold">{user.name ?? user.handle}</p>
          <p class="m-0 font-mono text-xs text-zinc-600">@{user.handle}</p>
        </div>
        {counts.length > 0 && (
          <p class="m-0 flex gap-5 text-xs text-zinc-600">
            {counts.map(([count, label]) => (
              <span key={label}>
                <strong class="text-sm text-zinc-900">{count}</strong> {label}
              </span>
            ))}
          </p>
        )}
        <a
          href={user.html_url}
          target="_blank"
          rel="noopener"
          class="flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white no-underline hover:bg-blue-700"
        >
          Open my profile
        </a>
      </section>

      {page && <OnThisPage page={page} settings={settings} />}

      <footer class="mt-auto flex items-center justify-between border-0 border-t border-solid border-zinc-200 px-4 py-2.5">
        <span class="text-[11px] text-zinc-600">This browser is one of your devices</span>
        <button
          type="button"
          onClick={onDisconnect}
          class="h-7 cursor-pointer rounded-md border border-solid border-zinc-200 bg-white px-2.5 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Disconnect
        </button>
      </footer>
    </>
  );
}

/** Where the GitHub page in the current tab gets its Commit button, or that the user turned it off. */
function OnThisPage({ page, settings }: { page: GitHubPage; settings: Settings }) {
  const feature = shareFeatureFor(page);
  if (!feature) return null;

  const label = 'url' in page ? shareLabel(page) : 'owner' in page ? `${page.owner}/${page.repository} releases` : '';

  return (
    <section aria-label="On this page" class="p-4">
      <h2 class="m-0 mb-2 text-[13px] font-semibold">On this page</h2>
      <div class="flex items-center gap-2.5 rounded-lg bg-zinc-100 px-3 py-2.5">
        <Octicon name="mark-github" class="text-zinc-600" />
        <div class="min-w-0">
          <p class="m-0 truncate font-mono text-xs">{label}</p>
          <p class="m-0 text-[11px] text-zinc-600">{settings[feature.id] ? feature.hint : 'Turned off in settings'}</p>
        </div>
      </div>
    </section>
  );
}
