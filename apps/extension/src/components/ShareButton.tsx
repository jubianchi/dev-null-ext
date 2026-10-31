import { useEffect, useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import { useSession } from '../lib/use-session.ts';
import type { SharedPage } from '../lib/share.ts';
import { ComposerDialog } from './ComposerDialog.tsx';
import { Glyph } from './Glyph.tsx';

/**
 * A button in GitHub's own style that opens the composer for the repository, pull request or issue on screen. Only
 * when connected to /dev/null: there is nothing to do with it otherwise.
 */
export function ShareButton({ page }: { page: SharedPage }) {
  const user = useSession();
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState<string | null>(null);

  useEffect(() => {
    ask({ type: 'owner-type', login: page.owner }).then(
      (type) => setOrganization(type === 'Organization' ? page.owner : null),
      () => setOrganization(null),
    );
  }, [page.owner]);

  if (!user) return null;

  return (
    <span class="inline-flex font-sans">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        class="inline-flex h-7 items-center gap-1.5 rounded-md border border-button-border bg-button px-2.5 text-xs font-medium text-fg hover:bg-button-hover"
      >
        <Glyph class="size-3.5" />
        Commit
      </button>
      {open && <ComposerDialog target={{ page, organization }} onClose={() => setOpen(false)} />}
    </span>
  );
}
