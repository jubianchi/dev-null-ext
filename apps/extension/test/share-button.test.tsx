// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { ShareButton } = await import('../src/components/ShareButton.tsx');
const { dispatchSharePage } = await import('../src/lib/shortcut.ts');

const user = { id: '1', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };
const page = {
  kind: 'issue' as const,
  owner: 'laravel',
  repository: 'framework',
  number: 1,
  title: 'Bug',
  url: 'https://github.com/laravel/framework/issues/1',
};

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function mount(session: typeof user | null, size: 'medium' | 'small' = 'medium', spacing?: 'start' | 'end') {
  ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? session : 'Organization'));
  await act(async () => {
    render(<ShareButton page={page} size={size} spacing={spacing} />, root);
  });
}

describe('ShareButton, keyboard shortcut', () => {
  async function mountWith(shortcut: boolean) {
    ask.mockImplementation(async (request: { type: string }) =>
      request.type === 'session' ? user : request.type.startsWith('stash:') ? null : 'Organization',
    );
    await act(async () => {
      render(<ShareButton page={page} size="medium" shortcut={shortcut} />, root);
    });
    // The session answers, then the button listens.
    await act(async () => {});
  }

  it("opens its composer when the shortcut asks for the page's", async () => {
    await mountWith(true);
    expect(root.querySelector('dialog')).toBeNull();

    await act(async () => {
      dispatchSharePage();
    });

    expect(root.querySelector('dialog')).not.toBeNull();
    expect(root.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
  });

  it("leaves it to the page's own button, when it isn't that one", async () => {
    await mountWith(false);
    await act(async () => {
      dispatchSharePage();
    });

    expect(root.querySelector('dialog')).toBeNull();
  });
});

describe('ShareButton', () => {
  it('shows the Commit button when signed in', async () => {
    await mount(user);

    expect(root.querySelector('button')?.textContent).toContain('Commit');
  });

  it("measures as GitHub's medium buttons in an issue's or a pull request's header", async () => {
    await mount(user, 'medium');

    expect(root.querySelector('button')?.className).toMatch(/\bh-8\b.*\bpx-3\b.*\btext-sm\b/);
  });

  it("measures as GitHub's small buttons in a repository's header", async () => {
    await mount(user, 'small');

    expect(root.querySelector('button')?.className).toMatch(/\bh-7\b.*\bpx-2\b.*\btext-xs\b/);
  });

  it("spaces itself from GitHub's buttons from inside its shadow root, which WXT's host reset can't undo", async () => {
    await mount(user, 'small', 'end');
    expect(root.firstElementChild?.className).toContain('mr-2');

    await mount(user, 'medium', 'start');
    expect(root.firstElementChild?.className).toContain('ml-2');
  });

  it('reads who opened the issue when opening the composer, once GitHub has rendered it', async () => {
    await mount(user);
    document.body.insertAdjacentHTML('beforeend', '<a data-testid="issue-body-header-author" id="author">taylorotwell</a>');

    await act(async () => root.querySelector('button')!.click());
    await act(async () => {});

    await act(async () => root.querySelector<HTMLButtonElement>('[role="toolbar"] button[aria-label="Insert a mention"]')!.click());
    expect([...root.querySelectorAll('[role="menuitemcheckbox"] [data-label]')].map((label) => label.textContent)).toContain('@taylorotwell');
    document.getElementById('author')?.remove();
  });

  it("leaves out the additions the user turned off, such as the author's mention", async () => {
    ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? user : 'User'));
    await act(async () => {
      render(<ShareButton page={page} size="medium" disabled={new Set(['author-mention'])} />, root);
    });
    await act(async () => {});
    document.body.insertAdjacentHTML('beforeend', '<a data-testid="issue-body-header-author" id="author">taylorotwell</a>');

    await act(async () => root.querySelector('button')!.click());
    await act(async () => {});

    expect(root.querySelector('[role="toolbar"] button[aria-label="Insert @taylorotwell"]')).toBeNull();
    document.getElementById('author')?.remove();
  });

  it('shows nothing when signed out', async () => {
    await mount(null);

    expect(root.innerHTML).toBe('');
  });
});
