// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { InlineComposer } = await import('../src/components/InlineComposer.tsx');

const user = { id: '1', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };
const committed = { id: 'c1', short_hash: 'abc1234', body: 'Shipped @laravel', status: 'approved', html_url: 'https://dev-null.sh/c1' };

const preview = {
  body: 'Run `npm i`',
  body_segments: [
    { type: 'text', text: 'Run ' },
    { type: 'code', code: 'npm i' },
  ],
  preview_segments: null,
  mentions: [],
};

let root: HTMLElement;
const onCommitted = vi.fn();

beforeEach(async () => {
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) => {
    if (request.type === 'session') return user;
    if (request.type === 'preview') return preview;
    return committed;
  });
  onCommitted.mockReset();
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => {
    render(<InlineComposer organization="laravel" onCommitted={onCommitted} />, root);
  });
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function type(value: string) {
  const textarea = root.querySelector('textarea')!;
  await act(async () => {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit() {
  await act(async () => {
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

/** Opens the Preview tab, then lets the preview request answer. */
async function openPreview() {
  await act(async () => tab('Preview').click());
  await act(async () => {});
}

const tab = (name: string) => [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((element) => element.textContent === name)!;
const button = (label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

async function attach(...files: File[]) {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {});
}

const png = (name = 'shot.png') => new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });

describe('InlineComposer, images', () => {
  it('attaches images from its toolbar, GitHub style footer and file picker, showing them', async () => {
    expect(root.querySelector('input[type="file"]')?.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp');
    expect(root.textContent).toContain('Paste, drop, or click to add files');

    await attach(png());

    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(1);
    expect(root.querySelector('[data-attached-image] img')?.getAttribute('alt')).toBe('shot.png');
  });

  it('describes an image from its ALT badge, as dev-null.sh does, and removes it', async () => {
    await attach(png());
    const badge = root.querySelector<HTMLButtonElement>('[data-attached-image] button[aria-label="Describe image 1"]')!;
    expect(badge.textContent).toBe('+ALT');
    expect(root.querySelector('[data-image-description]')).toBeNull();

    await act(async () => badge.click());
    const description = root.querySelector<HTMLTextAreaElement>('[data-image-description] textarea')!;
    expect(root.querySelector('[data-image-description]')?.textContent).toContain('Description of image 1');
    expect(description.getAttribute('placeholder')).toBe("Describe the image for people who can't see it");

    await act(async () => {
      description.value = 'The new popup';
      description.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(root.querySelector('[data-image-description]')?.textContent).toContain('13/1000');

    await act(async () =>
      [...root.querySelectorAll<HTMLButtonElement>('[data-image-description] button')].find((button) => button.textContent === 'Done')!.click(),
    );
    expect(root.querySelector('[data-image-description]')).toBeNull();
    expect(badge.textContent).toBe('ALT');

    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Remove image 1"]')!.click());
    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(0);
  });

  it('says why it refuses an image, and keeps the others', async () => {
    await attach(png('a.png'), new File(['gif'], 'b.gif', { type: 'image/gif' }));

    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(1);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('b.gif: only JPEG, PNG and WebP images can be attached.');
  });

  it('commits images without text, with their descriptions', async () => {
    await attach(png());
    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Describe image 1"]')!.click());
    await act(async () => {
      const description = root.querySelector<HTMLTextAreaElement>('[data-image-description] textarea')!;
      description.value = 'The new popup';
      description.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await submit();
    await act(async () => {});

    expect(ask).toHaveBeenLastCalledWith({
      type: 'commit',
      body: '',
      images: [{ data: btoa(String.fromCharCode(137, 80, 78, 71)), type: 'image/png', description: 'The new popup' }],
    });
    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(0);
  });

  it('disables adding images once it has 3, as dev-null.sh does, until one is removed', async () => {
    const footer = () => [...root.querySelectorAll<HTMLButtonElement>('button')].find((element) => element.textContent?.includes('Paste, drop'))!;
    await attach(png('a.png'), png('b.png'));
    expect(button('Attach images')?.disabled).toBe(false);

    await attach(png('c.png'));
    expect(button('Attach images')?.disabled).toBe(true);
    expect(footer().disabled).toBe(true);

    await act(async () => button('Remove image 1')!.click());
    expect(button('Attach images')?.disabled).toBe(false);
    expect(footer().disabled).toBe(false);
  });

  it('previews the attached images, even without text', async () => {
    await attach(png());
    await openPreview();

    expect(root.querySelector('[role="tabpanel"]')?.textContent).not.toContain('Nothing to preview');
    expect(root.querySelector('[role="tabpanel"] img')?.getAttribute('alt')).toBe('Attached image');
  });

  it('hides the thumbnails while previewing, as dev-null.sh does', async () => {
    await attach(png());
    await openPreview();
    expect(root.querySelector('[data-attached-image]')).toBeNull();

    await act(async () => tab('Write').click());
    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(1);
  });

  it('attaches pasted images', async () => {
    const textarea = root.querySelector('textarea')!;
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: { files: [png()] } });
    await act(async () => {
      textarea.dispatchEvent(paste);
    });
    await act(async () => {});

    expect(root.querySelectorAll('[data-attached-image]')).toHaveLength(1);
    expect(paste.defaultPrevented).toBe(true);
  });
});

describe('InlineComposer, mention suggestions', () => {
  const listbox = () => root.querySelector('[role="listbox"]');
  const options = () => [...root.querySelectorAll<HTMLElement>('[role="option"]')];
  const key = async (name: string) => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    await act(async () => {
      root.querySelector('textarea')!.dispatchEvent(event);
    });
    return event;
  };

  it('suggests the organization while typing a mention, as dev-null.sh does', async () => {
    await type('Thanks @la');

    expect(listbox()).not.toBeNull();
    expect(options().map((option) => option.dataset.handle)).toEqual(['laravel']);
    expect(options()[0]?.getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('textarea')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('completes the mention on Enter, followed by a space, and closes', async () => {
    await type('Thanks @la');
    const enter = await key('Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(root.querySelector('textarea')?.value).toBe('Thanks @laravel ');
    expect(listbox()).toBeNull();
  });

  it('completes the mention clicked', async () => {
    await type('@');
    await act(async () => options()[0]!.click());

    expect(root.querySelector('textarea')?.value).toBe('@laravel ');
  });

  it('closes on Escape, and only the suggestions', async () => {
    await type('Thanks @la');
    const escapeKey = await key('Escape');

    expect(escapeKey.defaultPrevented).toBe(true);
    expect(listbox()).toBeNull();
    expect(root.querySelector('textarea')?.value).toBe('Thanks @la');
  });

  it('shows nothing when no one matches, nor outside a mention', async () => {
    await type('Thanks @zz');
    expect(listbox()).toBeNull();

    await type('me@la');
    expect(listbox()).toBeNull();
  });
});

describe('InlineComposer', () => {
  it("has GitHub's Write and Preview tabs, Write first", () => {
    expect([...root.querySelectorAll('[role="tab"]')].map((element) => element.textContent)).toEqual(['Write', 'Preview']);
    expect(tab('Write').getAttribute('aria-selected')).toBe('true');
  });

  it('opens empty, its placeholder showing, adding nothing by itself', () => {
    const textarea = root.querySelector('textarea')!;

    expect(textarea.value).toBe('');
    expect(textarea.getAttribute('placeholder')).toBe('What did you ship?');
    expect(root.textContent).toContain('0 / 4000');
  });

  it("offers the organization's mention in the toolbar by the tabs, saying why", () => {
    const mention = root.querySelector('[role="toolbar"]')?.querySelector<HTMLButtonElement>('button[aria-label="Insert @laravel"]');

    expect(mention?.querySelector('svg.octicon-mention')).not.toBeNull();
    expect(mention?.getAttribute('title')).toContain("so the commit shows on the organization's /dev/null page");
  });

  it('inserts the mention at the caret, and says it is in, typed by hand too', async () => {
    await type('Thanks for it');
    const textarea = root.querySelector('textarea')!;
    textarea.setSelectionRange(6, 6);

    await act(async () => button('Insert @laravel')!.click());
    expect(textarea.value).toBe('Thanks @laravel for it');
    expect(button('Insert @laravel (already in your commit)')).not.toBeNull();

    await type('Thanks @Laravel');
    expect(button('Insert @laravel (already in your commit)')).not.toBeNull();
  });

  it("warns, once the user writes, that the commit won't show in the log without the mention", async () => {
    expect(root.querySelector('[role="status"]')).toBeNull();

    await type('Shipped');
    expect(root.querySelector('[role="status"]')?.textContent).toContain("Not mentioning @laravel: this commit won't show here.");

    await act(async () => [...root.querySelectorAll<HTMLButtonElement>('[role="status"] button')][0]!.click());
    expect(root.querySelector('textarea')?.value).toBe('Shipped @laravel');
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('commits without the mention when the user chooses to', async () => {
    await type('Shipped');
    await submit();

    expect(ask).toHaveBeenLastCalledWith({ type: 'commit', body: 'Shipped' });
  });

  it('previews the commit as /dev/null will render it in the Preview tab', async () => {
    await type('Run `npm i`');
    await openPreview();

    expect(ask).toHaveBeenLastCalledWith({ type: 'preview', body: 'Run `npm i`' });
    expect(tab('Preview').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('textarea')).toBeNull();
    expect(root.querySelector('[role="tabpanel"] code')?.textContent).toBe('npm i');
  });

  it('falls back to the plain text when the preview fails', async () => {
    await type('Shipped');
    ask.mockRejectedValueOnce(new Error('offline'));
    await openPreview();

    expect(root.querySelector('[role="tabpanel"]')?.textContent).toContain('Shipped');
  });

  it("counts the commit's characters against /dev/null's limit", async () => {
    await type('Shipped 🚀 @laravel');

    expect(root.textContent).toContain('18 / 4000');
  });

  it("says what /dev/null's commits support", () => {
    expect(root.textContent).toContain('Links, @mentions, :emoji: and `code` are supported');
  });

  it('commits, hands the commit to the log and clears the draft for the next one', async () => {
    await type('Shipped @laravel');
    await submit();

    expect(ask).toHaveBeenLastCalledWith({ type: 'commit', body: 'Shipped @laravel' });
    expect(onCommitted).toHaveBeenCalledWith(committed);
    expect(root.querySelector('textarea')?.value).toBe('');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent).toBe('Commit');
  });
});
