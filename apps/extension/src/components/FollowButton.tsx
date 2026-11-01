import { useEffect, useState } from 'preact/hooks';
import type { FollowState } from '../lib/follows.ts';
import { ask, BackgroundError } from '../lib/messages.ts';
import { Glyph } from './Glyph.tsx';
import { BUTTON, BUTTON_SIZES, DANGER_BUTTON } from './github-button.ts';

type Shown = FollowState | 'blocked';

/**
 * Follow someone GitHub lists on /dev/null, as GitHub's own Follow button beside it: Follow, or Unfollow for someone
 * followed, drawn as Primer's danger button. /dev/null's glyph tells the two apart, all in the text colour on Unfollow
 * so it turns white with it. Nothing on oneself.
 */
export function FollowButton({
  handle,
  state,
  size,
  block = false,
}: {
  handle: string;
  state: FollowState;
  size: keyof typeof BUTTON_SIZES;
  /** Fills its container, as GitHub's Follow on a profile. */
  block?: boolean;
}) {
  const [shown, setShown] = useState<Shown>(state);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => setShown(state), [state]);

  if (shown === 'self') return null;

  async function toggle() {
    setPending(true);
    setProblem(null);
    try {
      setShown(await ask({ type: 'follow', handle, follow: shown !== 'following' }));
    } catch (error) {
      if (error instanceof BackgroundError && error.status === 403) setShown('blocked');
      else setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  const unavailable = shown === 'absent' || shown === 'blocked';
  const following = shown === 'following';
  const label = shown === 'absent' ? 'Not on /dev/null' : shown === 'blocked' ? "Can't follow" : following ? 'Unfollow' : 'Follow';
  const title =
    problem ?? (shown === 'blocked' ? `You can't follow @${handle} on /dev/null.` : shown === 'absent' ? `@${handle} isn't on /dev/null yet.` : undefined);

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending || unavailable}
      aria-label={unavailable ? undefined : `${label} @${handle} on /dev/null`}
      title={title}
      class={`${BUTTON_SIZES[size]} ${following ? DANGER_BUTTON : BUTTON} font-sans disabled:cursor-default disabled:opacity-60 ${block ? 'w-full justify-center' : ''}`}
    >
      <Glyph class="size-4 shrink-0" muted={unavailable || following} />
      {label}
    </button>
  );
}
