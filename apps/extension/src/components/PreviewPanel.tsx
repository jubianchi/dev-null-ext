import type { CommitPreview } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import { CommitBody } from './CommitBody.tsx';

/** The preview /dev/null renders, or the plain text when it can't (offline, signed out, invalid body). */
type Preview = { status: 'loading' } | { status: 'loaded'; preview: CommitPreview } | { status: 'failed' };

/** A commit as /dev/null will publish it, asked for when shown, for both composers. */
export function PreviewPanel({ body }: { body: string }) {
  const [preview, setPreview] = useState<Preview>({ status: 'loading' });
  const empty = body === '';

  useEffect(() => {
    if (empty) return;

    let current = true;
    setPreview({ status: 'loading' });
    ask({ type: 'preview', body }).then(
      (result) => current && setPreview({ status: 'loaded', preview: result }),
      () => current && setPreview({ status: 'failed' }),
    );
    return () => {
      current = false;
    };
  }, [body, empty]);

  if (empty) return <span class="text-fg-muted">Nothing to preview</span>;
  if (preview.status === 'loading') return <span class="text-fg-muted">Loading preview…</span>;
  if (preview.status === 'failed') return <div class="whitespace-pre-wrap break-words text-fg">{body}</div>;

  return <CommitBody segments={preview.preview.body_segments} mentions={preview.preview.mentions} />;
}
