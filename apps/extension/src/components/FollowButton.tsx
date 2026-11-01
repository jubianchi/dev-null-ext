import { useEffect, useState } from 'preact/hooks';
import type { FollowState } from '../lib/follows.ts';
import { ask, BackgroundError } from '../lib/messages.ts';
import { Glyph } from './Glyph.tsx';
import { BUTTON, BUTTON_SIZES } from './github-button.ts';

type Shown = FollowState | 'blocked';

/**
 * Follow someone GitHub lists on /dev/null, as dev-null.sh's follow button: Follow, or Following that turns into a red
 * Unfollow on hover, but not right after following, until the pointer leaves. /dev/null's glyph tells it apart from
 * GitHub's own Follow beside it. Nothing on oneself.
 */
export function FollowButton({ handle, state, size }: { handle: string; state: FollowState; size: keyof typeof BUTTON_SIZES }) {
  const [shown, setShown] = useState<Shown>(state);
  const [pending, setPending] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => setShown(state), [state]);

  if (shown === 'self') return null;

  async function toggle() {
    const follow = shown !== 'following';
    setPending(true);
    setProblem(null);
    try {
      const next = await ask({ type: 'follow', handle, follow });
      setShown(next);
      setJustFollowed(next === 'following');
    } catch (error) {
      if (error instanceof BackgroundError && error.status === 403) setShown('blocked');
      else setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  const unavailable = shown === 'absent' || shown === 'blocked';
  const unfollowing = shown === 'following' && hovered && !justFollowed;
  const label = unavailable
    ? shown === 'absent'
      ? 'Not on /dev/null'
      : "Can't follow"
    : shown === 'following'
      ? unfollowing
        ? 'Unfollow'
        : 'Following'
      : 'Follow';
  const title =
    problem ?? (shown === 'blocked' ? `You can't follow @${handle} on /dev/null.` : shown === 'absent' ? `@${handle} isn't on /dev/null yet.` : undefined);

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setJustFollowed(false);
      }}
      disabled={pending || unavailable}
      aria-label={unavailable ? undefined : `${shown === 'following' ? 'Unfollow' : 'Follow'} @${handle} on /dev/null`}
      title={title}
      class={`${BUTTON_SIZES[size]} ${BUTTON} font-sans disabled:cursor-default disabled:opacity-60 ${unfollowing ? 'text-fg-danger' : ''}`}
    >
      <Glyph class="size-4 shrink-0" muted={unavailable} />
      {label}
    </button>
  );
}
