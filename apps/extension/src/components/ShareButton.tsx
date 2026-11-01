import { useEffect, useState } from 'preact/hooks';
import { readAuthor } from '../lib/github/page.ts';
import { ask } from '../lib/messages.ts';
import type { SharedPage } from '../lib/share.ts';
import { useSession } from '../lib/use-session.ts';
import { ComposerDialog } from './ComposerDialog.tsx';
import { Glyph } from './Glyph.tsx';
import { BUTTON, BUTTON_SIZES } from './github-button.ts';

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
  disabled,
}: {
  page: SharedPage;
  size: 'medium' | 'small';
  /**
   * The space to keep from GitHub's elements when their container doesn't space them. It is set in here: WXT resets
   * the host (`:host { all: initial !important }`), which wins over any style the page side gives it.
   */
  spacing?: 'start' | 'end';
  /** The additions the user turned off in the extension's settings. */
  disabled?: ReadonlySet<string>;
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
      <button type="button" onClick={() => setOpened(withAuthor(page))} aria-expanded={opened !== null} class={`${BUTTON_SIZES[size]} ${BUTTON}`}>
        <Glyph class="size-4 shrink-0" />
        Commit
      </button>
      {opened && <ComposerDialog target={{ page: opened, organization, disabled }} onClose={() => setOpened(null)} />}
    </span>
  );
}
