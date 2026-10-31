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
