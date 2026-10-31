import { useEffect, useState } from 'preact/hooks';
import { readAuthor } from '../lib/github/page.ts';
import { ask } from '../lib/messages.ts';
import { useSession } from '../lib/use-session.ts';
import type { SharedPage } from '../lib/share.ts';
import { ComposerDialog } from './ComposerDialog.tsx';
import { Glyph } from './Glyph.tsx';

/**
 * GitHub's default button, measured on its pages (Primer's Button): medium in an issue's or a pull request's header,
 * small in a repository's. The colours are Primer's own variables, which reach into the shadow root.
 */
const SIZES = {
  medium: 'h-8 px-3 text-sm leading-[21px] gap-2',
  small: 'h-7 px-2 text-xs leading-[18px] gap-1',
} as const;

const BUTTON =
  'inline-flex items-center rounded-md border border-solid font-medium whitespace-nowrap cursor-pointer ' +
  'border-[var(--button-default-borderColor-rest,var(--color-button-border))] bg-[var(--button-default-bgColor-rest,var(--color-button))] ' +
  'text-[var(--button-default-fgColor-rest,var(--color-fg))] shadow-[var(--button-default-shadow-resting,none)] ' +
  'hover:border-[var(--button-default-borderColor-hover,var(--color-button-border))] hover:bg-[var(--button-default-bgColor-hover,var(--color-button-hover))] ' +
  'active:bg-[var(--button-default-bgColor-active,var(--color-button-hover))]';

/** The page with who opened it, read when the composer opens: by then GitHub has rendered it. */
function withAuthor(page: SharedPage): SharedPage {
  if (page.kind !== 'issue' && page.kind !== 'pull-request') return page;
  return { ...page, author: readAuthor(page, document) };
}

/**
 * A button exactly like GitHub's own, among them, that opens the composer for the repository, pull request or issue
 * on screen. Only when connected to /dev/null: there is nothing to do with it otherwise.
 */
export function ShareButton({
  page,
  size,
  spacing,
}: {
  page: SharedPage;
  size: 'medium' | 'small';
  /**
   * The space to keep from GitHub's elements when their container doesn't space them. It is set in here: WXT resets
   * the host (`:host { all: initial !important }`), which wins over any style the page side gives it.
   */
  spacing?: 'start' | 'end';
}) {
  const user = useSession();
  const [opened, setOpened] = useState<SharedPage | null>(null);
  const [organization, setOrganization] = useState<string | null>(null);

  useEffect(() => {
    ask({ type: 'owner-type', login: page.owner }).then(
      (type) => setOrganization(type === 'Organization' ? page.owner : null),
      () => setOrganization(null),
    );
  }, [page.owner]);

  if (!user) return null;

  return (
    <span class={`inline-flex font-sans ${spacing === 'end' ? 'mr-2' : spacing === 'start' ? 'ml-2' : ''}`}>
      <button
        type="button"
        onClick={() => setOpened(withAuthor(page))}
        aria-expanded={opened !== null}
        class={`${SIZES[size]} ${BUTTON}`}
      >
        <Glyph class="size-4 shrink-0" />
        Commit
      </button>
      {opened && <ComposerDialog target={{ page: opened, organization }} onClose={() => setOpened(null)} />}
    </span>
  );
}
