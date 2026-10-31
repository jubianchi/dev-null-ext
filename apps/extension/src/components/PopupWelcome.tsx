import { Octicon } from './Octicon.tsx';

const LANES = [
  'border-[#d9480f] bg-orange-50',
  'border-[#2f9e44] bg-green-50',
  'border-[#9c36b5] bg-purple-50',
  'border-[#0c8599] bg-cyan-50',
  'border-[#c2255c] bg-pink-50',
];

const POINTS = [
  ['text-[#d9480f]', 'Commit about a repository, an issue or a release'],
  ['text-[#2f9e44]', "Read an organization's log, in its tabs"],
  ['text-[#9c36b5]', 'Star and reply without leaving GitHub'],
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
            <span key={lane} class={`size-10 rounded-full border-2 border-dashed ${lane} ${index > 0 ? '-ml-2.5' : ''}`} aria-hidden="true" />
          ))}
          {count && <span class="ml-2.5 font-mono text-xs text-zinc-600">{count}</span>}
        </div>

        <div>
          <h1 class="m-0 mb-2 text-2xl font-bold leading-tight tracking-tight">{count ? `Join ${count} developers.` : 'Only developers post here.'}</h1>
          <p class="m-0 text-[13px] leading-relaxed text-zinc-600">
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

      <footer class="flex flex-col gap-2 border-0 border-t border-solid border-zinc-200 p-4">
        <button
          type="button"
          onClick={onJoin}
          class="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Octicon name="mark-github" />
          Join with GitHub
        </button>
        <p class="m-0 text-center text-[11px] text-zinc-600">Already on /dev/null? The same button connects this browser, as one of your devices.</p>
      </footer>
    </>
  );
}
