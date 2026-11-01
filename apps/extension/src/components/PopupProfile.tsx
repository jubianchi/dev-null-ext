import type { CurrentUser } from '@dev-null-ext/client';
import { Avatar } from './Avatar.tsx';
import { laneColor } from './CommitParts.tsx';

/**
 * The popup when connected, as dev-null.sh's profile card: the user's avatar in a dashed ring of their lane, their name
 * and handle, their counts when /dev/null sends them, and the way to their profile.
 */
export function PopupProfile({ user, onDisconnect }: { user: CurrentUser; onDisconnect: () => void }) {
  const counts = [
    [user.commits_count, 'commits'],
    [user.following_count, 'following'],
    [user.followers_count, 'followers'],
  ].filter((count): count is [number, string] => typeof count[0] === 'number');

  return (
    <>
      <section class="flex flex-col items-center gap-2.5 px-4 pb-4 pt-1 text-center">
        <div data-lane-ring class="size-[72px] rounded-full border-2 border-dashed p-[3px]" style={{ borderColor: laneColor(user, 'var(--color-lane-3)') }}>
          <Avatar person={user} size={62} />
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

      <footer class="flex items-center justify-between border-0 border-t border-solid border-zinc-200 px-4 py-2.5">
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
