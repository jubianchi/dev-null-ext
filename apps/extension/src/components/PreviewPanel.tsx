import type { CommitPreview } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import type { AttachedImage } from '../lib/use-commit-draft.ts';
import { CommitBody } from './CommitBody.tsx';
import { AttachedImagesPreview } from './CommitImages.tsx';

/** The preview /dev/null renders, or the plain text when it can't (offline, signed out, invalid body). */
type Preview = { status: 'loading' } | { status: 'loaded'; preview: CommitPreview } | { status: 'failed' };

/**
 * A commit as /dev/null will publish it, for both composers: its text, asked for when shown, then its images, laid out
 * as the log lays them out.
 */
export function PreviewPanel({ body, images = [] }: { body: string; images?: AttachedImage[] }) {
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

  if (empty && images.length === 0) return <span class="text-fg-muted">Nothing to preview</span>;

  return (
    <>
      {!empty && preview.status === 'loading' && <span class="text-fg-muted">Loading preview…</span>}
      {!empty && preview.status === 'failed' && <div class="whitespace-pre-wrap break-words text-fg">{body}</div>}
      {!empty && preview.status === 'loaded' && <CommitBody segments={preview.preview.body_segments} mentions={preview.preview.mentions} />}
      <AttachedImagesPreview images={images} />
    </>
  );
}
