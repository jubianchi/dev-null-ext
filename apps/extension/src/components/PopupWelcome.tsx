import { Octicon } from './Octicon.tsx';

// The lanes, light or dark as dev-null.sh draws them: identity only, on decorative rings and glyphs.
const LANES = ['border-lane-0', 'border-lane-1', 'border-lane-2', 'border-lane-3', 'border-lane-4'];

const POINTS = [
  ['text-lane-0', 'Commit about a repository, an issue or a release'],
  ['text-lane-1', "Read an organization's log, in its tabs"],
  ['text-lane-2', 'Star and reply without leaving GitHub'],
] as const;

/**
 * The popup when not connected, as dev-null.sh greets its guests (dev-null-sh/dev-null.sh#1264): how many
 * developers are there when /dev/null tells, what the extension does on GitHub, and one button, which joins as well as
 * connects an existing account, since both go through GitHub on dev-null.sh.
 */
export function PopupWelcome({ developers, onJoin }: { developers: number | null; onJoin: () => void }) {
  const count = developers === null ? null : `${developers.toLocaleString('en-US')}+`;

  return (
    <>
      <div class="flex flex-1 flex-col justify-center gap-5 px-6 py-4">
        <div class="flex items-center">
          {LANES.map((lane, index) => (
            <span key={lane} class={`size-10 rounded-full border-2 border-dashed bg-canvas-muted ${lane} ${index > 0 ? '-ml-2.5' : ''}`} aria-hidden="true" />
          ))}
          {count && <span class="ml-2.5 font-mono text-xs text-fg-muted">{count}</span>}
        </div>

        <div>
          <h1 class="m-0 mb-2 text-2xl font-bold leading-tight tracking-tight">{count ? `Join ${count} developers.` : 'Only developers post here.'}</h1>
          <p class="m-0 text-[13px] leading-relaxed text-fg-muted">
            {count ? `${count} developers are already here. ` : ''}Sign in with GitHub to follow them, star commits, and join the conversation, right from
            GitHub's pages.
          </p>
        </div>

        <ul class="m-0 flex list-none flex-col gap-2 p-0 text-[13px]">
          {POINTS.map(([color, text]) => (
            <li key={text} class="flex items-baseline gap-2">
              <span class={`font-mono ${color}`} aria-hidden="true">
                {/*  */}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <footer class="flex flex-col gap-2 border-0 border-t border-solid border-border p-4">
        <button
          type="button"
          onClick={onJoin}
          class="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-primary text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          <Octicon name="mark-github" />
          Join with GitHub
        </button>
        <p class="m-0 text-center text-[11px] text-fg-muted">Already on /dev/null? The same button connects this browser, as one of your devices.</p>
      </footer>
    </>
  );
}
