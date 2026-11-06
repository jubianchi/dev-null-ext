import { stashName } from '../lib/stash.ts';
import { useStashed } from '../lib/use-stashed.ts';
import { cleanUrl, pageKind, type WebPage } from '../lib/web-page.ts';

/** The active tab, as the browser tells it once the user clicked the extension's button (activeTab). */
export interface ActiveTab {
  url?: string;
  title?: string;
}

/**
 * The popup's "On this page": the page in the current tab, and the way to commit about it. Not on github.com, whose
 * pages the extension shares with buttons of their own; disabled off the web, saying why.
 */
export function PopupPage({ tab, onShare }: { tab: ActiveTab | null; onShare: (page: WebPage) => void }) {
  const kind = pageKind(tab?.url);
  const page = tab?.url && kind === 'web' ? { url: cleanUrl(tab.url), title: tab.title ?? tab.url } : null;
  const stash = page ? stashName({ web: page }) : null;
  const stashed = useStashed(stash ? [stash] : [], []);

  if (!tab || kind === 'github') return null;

  return (
    <section class="flex flex-col gap-2 px-4 pb-4">
      <h2 class="m-0 text-[13px] font-semibold">On this page</h2>
      <div class="flex items-center gap-2.5 rounded-lg bg-zinc-100 px-3 py-2.5">
        <div class="min-w-0 flex-1">
          <p class="m-0 truncate font-mono text-xs">{page ? new URL(page.url).hostname : (tab.url ?? 'This page')}</p>
          {tab.title && <p class="m-0 truncate text-[11px] text-zinc-600">{tab.title}</p>}
        </div>
      </div>
      <button
        type="button"
        disabled={!page}
        onClick={() => page && onShare(page)}
        class="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-solid border-zinc-300 bg-white text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      >
        Commit this page
        {stash && stashed.has(stash) && (
          <span title="You have an unsent commit about this page" class="font-mono text-[11px] font-normal text-zinc-600">
            stash@{'{0}'}
          </span>
        )}
      </button>
      {!page && <p class="m-0 text-[11px] text-zinc-600">Only web pages can be committed: this one is the browser's own.</p>}
    </section>
  );
}
