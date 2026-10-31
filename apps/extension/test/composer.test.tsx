// @vitest-environment happy-dom
import type { CurrentUser } from '@devnull-github/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { Composer } = await import('../src/components/Composer.tsx');
const { ComposerDialog } = await import('../src/components/ComposerDialog.tsx');

const user: CurrentUser = {
  id: '1',
  handle: 'jubianchi',
  name: 'Julien',
  avatar_url: 'https://avatars.example/jubianchi.png',
  bio: null,
  github_url: 'https://github.com/jubianchi',
  html_url: 'https://dev-null.sh/@jubianchi',
  terms_accepted: true,
};

const page = { kind: 'repository' as const, owner: 'laravel', repository: 'framework', url: 'https://github.com/laravel/framework' };
const issue = {
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
  ask.mockResolvedValue(user);
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function mount(vnode: preact.ComponentChild) {
  await act(async () => {
    render(vnode, root);
  });
  // The session answers, then the composer's effects run on the form it shows.
  await act(async () => {});
}

describe('Composer', () => {
  it("shows the signed-in user's avatar beside the text", async () => {
    await mount(<Composer target={{ page, organization: null }} />);

    const avatar = root.querySelector<HTMLImageElement>('img');
    expect(avatar?.getAttribute('src')).toBe(user.avatar_url);
    expect(avatar?.getAttribute('alt')).toBe('@jubianchi');
    expect(root.querySelector('textarea')).not.toBeNull();
  });

  it('disables adding images once it has 3, as dev-null.sh does', async () => {
    await mount(<Composer target={{ page, organization: null }} />);
    const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
    const png = (name: string) => new File([new Uint8Array([1])], name, { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [png('a.png'), png('b.png'), png('c.png')], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(root.querySelector<HTMLButtonElement>('button[aria-label="Attach images"]')?.disabled).toBe(true);
  });

  it('hides the thumbnails while previewing, as dev-null.sh does', async () => {
    await mount(<Composer target={{ page, organization: null }} />);
    const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(1);

    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Preview"]')!.click());
    expect(root.querySelector('[data-attached-image]')).toBeNull();
  });

  it("offers the page's link and the organization's mention in its toolbar, inserting nothing by itself", async () => {
    await mount(<Composer target={{ page, organization: 'laravel' }} />);

    const textarea = root.querySelector('textarea')!;
    const toolbar = root.querySelector('[role="toolbar"]')!;
    expect(textarea.value).toBe('');
    expect(toolbar.querySelector('button[aria-label="Insert laravel/framework"] svg.octicon-link')).not.toBeNull();
    expect(toolbar.querySelector('button[aria-label="Insert @laravel"] svg.octicon-mention')).not.toBeNull();

    await act(async () => toolbar.querySelector<HTMLButtonElement>('button[aria-label="Insert laravel/framework"]')!.click());
    expect(textarea.value).toBe(page.url);
    expect(toolbar.querySelector('button[aria-label="Insert laravel/framework (already in your commit)"]')).not.toBeNull();
  });

  it("offers to mention who opened the page, unless it's the user themselves", async () => {
    await mount(<Composer target={{ page: { ...issue, author: 'taylorotwell' }, organization: null }} />);
    expect(root.querySelector('[role="toolbar"] button[aria-label="Insert @taylorotwell"]')).not.toBeNull();

    render(null, root);
    await mount(<Composer target={{ page: { ...issue, author: 'jubianchi' }, organization: null }} />);
    expect(root.querySelector('[role="toolbar"] button[aria-label="Insert @jubianchi"]')).toBeNull();
  });

  it('gathers several mentions under one @ button, a menu to choose from, as GitHub does', async () => {
    await mount(<Composer target={{ page: { ...issue, author: 'taylorotwell' }, organization: 'laravel' }} />);
    const toolbar = root.querySelector('[role="toolbar"]')!;
    const mentions = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Insert a mention"]')!;

    expect(mentions.getAttribute('aria-haspopup')).toBe('menu');
    expect(mentions.getAttribute('aria-expanded')).toBe('false');
    expect(toolbar.querySelector('button[aria-label="Insert @taylorotwell"]')).toBeNull();

    await act(async () => mentions.click());
    const items = [...root.querySelectorAll<HTMLButtonElement>('[role="menu"] [role="menuitem"]')];
    expect(mentions.getAttribute('aria-expanded')).toBe('true');
    expect(items.map((item) => item.querySelector('[data-label]')?.textContent)).toEqual(['@taylorotwell', '@laravel']);
    expect(items[0]?.textContent).toContain('who opened this issue');

    await act(async () => items[1]!.click());
    expect(root.querySelector('textarea')?.value).toBe('@laravel');
    expect(root.querySelector('[role="menu"]')).toBeNull();

    await act(async () => mentions.click());
    expect(root.querySelector('[role="menu"] [role="menuitem"]:last-child')?.getAttribute('aria-checked')).toBe('true');
  });

  it('highlights a menu item for the keyboard only, not the one focused on opening it with the pointer', async () => {
    await mount(<Composer target={{ page: { ...issue, author: 'taylorotwell' }, organization: 'laravel' }} />);
    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Insert a mention"]')!.click());

    for (const item of root.querySelectorAll('[role="menuitem"]')) {
      expect(item.className).toContain('focus-visible:bg-button-hover');
      expect(item.className).not.toMatch(/(^|\s)focus:bg-/);
    }
  });

  it('closes the menu on Escape without closing anything else', async () => {
    await mount(<Composer target={{ page: { ...issue, author: 'taylorotwell' }, organization: 'laravel' }} />);
    const mentions = root.querySelector<HTMLButtonElement>('button[aria-label="Insert a mention"]')!;
    await act(async () => mentions.click());

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => {
      root.querySelector('[role="menu"]')!.dispatchEvent(escape);
    });

    expect(root.querySelector('[role="menu"]')).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
  });

  it("doesn't warn about the organization's mention when sharing a page", async () => {
    await mount(<Composer target={{ page, organization: 'laravel' }} />);
    const textarea = root.querySelector('textarea')!;
    await act(async () => {
      textarea.value = 'Merged';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('previews the commit from the eye in its toolbar, as dev-null.sh does', async () => {
    await mount(<Composer target={{ page: null, organization: 'laravel' }} />);
    ask.mockResolvedValueOnce({
      body: 'Run `npm i`',
      body_segments: [
        { type: 'text', text: 'Run ' },
        { type: 'code', code: 'npm i' },
      ],
      preview_segments: null,
      mentions: [],
    });

    const textarea = root.querySelector('textarea')!;
    await act(async () => {
      textarea.value = `Run \`npm i\`${textarea.value}`;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const eye = root.querySelector<HTMLButtonElement>('[role="toolbar"] button[aria-label="Preview"]')!;
    expect(eye.querySelector('svg.octicon-eye')).not.toBeNull();

    await act(async () => eye.click());
    await act(async () => {});

    expect(eye.getAttribute('aria-pressed')).toBe('true');
    expect(ask).toHaveBeenLastCalledWith({ type: 'preview', body: 'Run `npm i`' });
    expect(root.querySelector('textarea')).toBeNull();
    expect(root.querySelector('code')?.textContent).toBe('npm i');

    await act(async () => eye.click());
    expect(root.querySelector('textarea')?.value).toBe('Run `npm i`');
  });

  it('attaches images from the first button of its toolbar, and commits them', async () => {
    await mount(<Composer target={{ page: null, organization: 'laravel' }} />);
    ask.mockResolvedValueOnce({ id: 'c', status: 'approved', html_url: 'https://dev-null.sh/c' });

    const toolbar = root.querySelector('[role="toolbar"]')!;
    expect(toolbar.firstElementChild?.getAttribute('aria-label')).toBe('Attach images');

    const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new File([new Uint8Array([1, 2])], 'shot.png', { type: 'image/png' })], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(1);

    await act(async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => {});

    expect(ask).toHaveBeenLastCalledWith({ type: 'commit', body: '', images: [{ data: btoa(String.fromCharCode(1, 2)), type: 'image/png', description: null }] });
  });

  it('commits what the user wrote', async () => {
    await mount(<Composer target={{ page: null, organization: 'laravel' }} />);
    ask.mockResolvedValueOnce({ id: 'c', status: 'approved', html_url: 'https://dev-null.sh/c' });

    const textarea = root.querySelector('textarea')!;
    await act(async () => {
      textarea.value = `Hello${textarea.value}`;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => {});

    expect(ask).toHaveBeenLastCalledWith({ type: 'commit', body: 'Hello' });
    expect(root.textContent).toContain('View on /dev/null');
  });
});

describe('ComposerDialog', () => {
  it('opens the composer in a modal dialog', async () => {
    await mount(<ComposerDialog target={{ page, organization: null }} onClose={() => {}} />);

    const dialog = root.querySelector('dialog');
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute('aria-label')).toBe('Write a commit');
    expect(dialog?.querySelector('textarea')).not.toBeNull();
  });

  it('tells when it closes, from Escape as from its close button', async () => {
    const onClose = vi.fn();
    await mount(<ComposerDialog target={{ page, organization: null }} onClose={onClose} />);

    await act(async () => {
      root.querySelector('dialog')!.dispatchEvent(new Event('close'));
    });
    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click());

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
