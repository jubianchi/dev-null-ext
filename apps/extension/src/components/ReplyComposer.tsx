import type { Commit } from '@dev-null-ext/client';
import { useCommitDraft } from '../lib/use-commit-draft.ts';
import { DraftForm } from './DraftForm.tsx';

/**
 * A reply to a commit of the log, under it, as dev-null.sh's ReplyComposer: the commit replied to is the one above, so
 * it isn't repeated; /dev/null notifies its author, so nothing is prefilled. Images, preview and mentions as in the
 * other composers, the thread's people suggested first.
 */
export function ReplyComposer({ parent, onReplied, onCancel }: { parent: Commit; onReplied: (reply: Commit) => void; onCancel: () => void }) {
  const draft = useCommitDraft({ parentId: parent.id }, onReplied);
  const { step } = draft.state;

  if (step === 'loading' || step === 'signed-out' || step === 'sent') return null;

  return (
    <div data-reply-composer class="mt-2 rounded-md border border-border bg-canvas p-2">
      <DraftForm
        draft={draft}
        label={`Reply to @${parent.author.handle}`}
        action="Reply"
        sending="Replying…"
        previewTitle="Preview the reply as /dev/null will publish it"
        reply={parent.id}
        onCancel={onCancel}
      />
    </div>
  );
}
