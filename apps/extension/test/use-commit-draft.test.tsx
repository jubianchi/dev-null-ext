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
  ask.mockImplementation(async (request: { type: string }) => {
    if (request.type === 'session') return viewer;
    return request.type.startsWith('stash:') ? null : { id: 'q1' };
  });
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

describe('useCommitDraft, sharing a web page', () => {
  const web = { url: 'https://cbea.ms/git-commit/', title: 'How to Write a Git Commit Message' };
  const words = 'Still the reference I send to every new teammate, seven rules.';

  async function sharing() {
    await act(async () => {
      render(<Harness target={{ web }} />, root);
    });
    await act(async () => {});
  }

  it("opens with the page's link, the caret before it, and its own stash", async () => {
    await sharing();

    expect(ask).toHaveBeenCalledWith({ type: 'stash:get', name: `page:${web.url}` });
    expect(draft.text).toBe(`\n\n${web.url}`);
    expect(draft.prefilled).toBe(true);
    expect(draft.additions).toMatchObject([{ id: 'page-link', text: web.url, label: 'cbea.ms' }]);
  });

  it('opens with its stash rather than the link, when one comes back', async () => {
    ask.mockImplementation(async (request: { type: string }) => {
      if (request.type === 'session') return viewer;
      if (request.type === 'stash:get') return { text: `Worth it\n\n${web.url}`, images: [] };
      return null;
    });
    await sharing();

    expect(draft.text).toBe(`Worth it\n\n${web.url}`);
    expect(draft.prefilled).toBe(false);
  });

  it('asks for 50 characters of their own words before committing, the link and quotes left out', async () => {
    await sharing();
    expect(draft.remaining).toBe(50);
    expect(draft.canCommit).toBe(false);

    await act(async () => draft.setText(`> Separate subject from body with a blank line\n\nSo true.\n\n${web.url}`));
    expect(draft.remaining).toBe(42);
    expect(draft.canCommit).toBe(false);

    await act(async () => draft.setText(`${words}\n\n${web.url}`));
    expect(draft.remaining).toBe(0);
    expect(draft.canCommit).toBe(true);
  });

  it('warns when the link is removed, and commits without it if the user chooses to', async () => {
    await sharing();
    await act(async () => draft.setText(words));

    expect(draft.warnings).toMatchObject([{ id: 'page-link', missing: "This commit doesn't share the page." }]);
    expect(draft.canCommit).toBe(true);
  });

  it('keeps no stash of the link alone, the composer closed untouched', async () => {
    await sharing();
    await act(async () => render(null, root));
    await act(async () => {});

    const puts = ask.mock.calls.map(([request]) => request).filter((request) => request.type === 'stash:put');
    expect(puts.every((request) => request.text === '')).toBe(true);
  });

  it('asks nothing of a commit that shares no page', async () => {
    await act(async () => {
      render(<Harness target={{ quotedCommitId: 'c1' }} />, root);
    });
    await act(async () => draft.setText('Yes'));

    expect(draft.remaining).toBe(0);
    expect(draft.prefilled).toBe(false);
    expect(draft.canCommit).toBe(true);
  });
});

describe('useCommitDraft, stashing', () => {
  const stashed = { text: 'So true', images: [{ id: 'img-1', type: 'image/png', name: 'a.png', description: 'A diagram', data: btoa('png bytes') }] };

  function answering(stash: typeof stashed | null, user: CurrentUser | null = viewer) {
    ask.mockImplementation(async (request: { type: string }) => {
      if (request.type === 'session') return user;
      if (request.type === 'stash:get') return stash;
      return request.type.startsWith('stash:') ? null : { id: 'q1' };
    });
  }

  async function quoting() {
    await act(async () => {
      render(<Harness target={{ quotedCommitId: 'c1' }} />, root);
    });
    await act(async () => {});
  }

  const puts = () => ask.mock.calls.map(([request]) => request).filter((request) => request.type === 'stash:put');

  it('restores the stash of its context, text and images, and says so', async () => {
    answering(stashed);
    await quoting();

    expect(ask).toHaveBeenCalledWith({ type: 'stash:get', name: 'quote-c1' });
    expect(draft.text).toBe('So true');
    expect(draft.images).toMatchObject([{ id: 'img-1', description: 'A diagram' }]);
    expect(draft.images[0]?.file).toMatchObject({ name: 'a.png', type: 'image/png' });
    expect(await draft.images[0]?.file.text()).toBe('png bytes');
    expect(draft.restored).toBe(true);
  });

  it('opens empty, not restored, without a stash', async () => {
    answering(null);
    await quoting();

    expect(draft.text).toBe('');
    expect(draft.restored).toBe(false);
  });

  it('saves the stash once the composer goes away, the images restored without their bytes again', async () => {
    answering(stashed);
    await quoting();
    await act(async () => draft.setText('So true!'));
    expect(puts()).toEqual([]);

    await act(async () => render(null, root));
    await act(async () => {});

    expect(puts().at(-1)).toEqual({
      type: 'stash:put',
      name: 'quote-c1',
      text: 'So true!',
      images: [{ id: 'img-1', type: 'image/png', name: 'a.png', description: 'A diagram' }],
    });
  });

  it('saves a new image with its bytes when the page goes away', async () => {
    answering(null);
    await quoting();
    await act(async () => draft.attach([new File(['png bytes'], 'b.png', { type: 'image/png' })]));

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await act(async () => {});

    expect(puts().at(-1)).toMatchObject({
      name: 'quote-c1',
      text: '',
      images: [{ type: 'image/png', name: 'b.png', description: '', data: btoa('png bytes') }],
    });
  });

  it('drops the stash once sent', async () => {
    answering(stashed);
    await quoting();
    await act(async () => draft.submit());

    expect(ask).toHaveBeenCalledWith({ type: 'stash:drop', name: 'quote-c1' });
  });

  it('drops the stash on demand, the composer emptied', async () => {
    answering(stashed);
    await quoting();
    await act(async () => draft.drop());

    expect(ask).toHaveBeenCalledWith({ type: 'stash:drop', name: 'quote-c1' });
    expect(draft.text).toBe('');
    expect(draft.images).toEqual([]);
    expect(draft.restored).toBe(false);
  });

  it('never stashes for a guest', async () => {
    answering(stashed, null);
    await quoting();
    await act(async () => render(null, root));

    expect(ask.mock.calls.filter(([request]) => request.type.startsWith('stash:'))).toEqual([]);
  });
});
