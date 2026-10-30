import { useEffect, useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import type { SharedPage } from '../lib/share.ts';
import { Composer } from './Composer.tsx';
import { Glyph } from './Glyph.tsx';

/** A button in GitHub's own style that opens the composer for the repository, pull request or issue on screen. */
export function ShareButton({ page }: { page: SharedPage }) {
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState<string | null>(null);

  useEffect(() => {
    ask({ type: 'owner-type', login: page.owner }).then(
      (type) => setOrganization(type === 'Organization' ? page.owner : null),
      () => setOrganization(null),
    );
  }, [page.owner]);

  return (
    <span class="relative inline-flex font-sans">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        class="inline-flex h-7 items-center gap-1.5 rounded-md border border-button-border bg-button px-2.5 text-xs font-medium text-fg hover:bg-button-hover"
      >
        <Glyph class="size-3.5" />
        Commit
      </button>
      {open && (
        <div class="absolute right-0 top-full z-50 mt-2">
          <Composer target={{ page, organization }} onClose={() => setOpen(false)} />
        </div>
      )}
    </span>
  );
}
