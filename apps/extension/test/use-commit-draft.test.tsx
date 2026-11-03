// @vitest-environment happy-dom
import type { CurrentUser } from '@dev-null-ext/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { useCommitDraft } = await import('../src/lib/use-commit-draft.ts');

const viewer: CurrentUser = { id: 'me', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };

let root: HTMLElement;
let draft: ReturnType<typeof useCommitDraft>;

function Harness({ target }: { target: Parameters<typeof useCommitDraft>[0] }) {
  draft = useCommitDraft(target);
  return null;
}

beforeEach(() => {
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? viewer : { id: 'q1' }));
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

describe('useCommitDraft, quoting a commit', () => {
  async function quoting() {
    await act(async () => {
      render(<Harness target={{ quotedCommitId: 'c1' }} />, root);
    });
  }

  it('sends the quoted commit with the text, and no additions', async () => {
    await quoting();
    expect(draft.additions).toEqual([]);

    await act(async () => draft.setText('So true'));
    await act(async () => draft.submit());

    expect(ask).toHaveBeenCalledWith({ type: 'commit', body: 'So true', quotedCommitId: 'c1' });
  });

  it('offers no poll, which /dev/null refuses on a quote', async () => {
    await quoting();

    expect(draft.canPoll).toBe(false);
  });
});
