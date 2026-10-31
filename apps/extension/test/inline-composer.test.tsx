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
const committed = { id: 'c1', short_hash: 'abc1234', body: 'Shipped\n\n@laravel', status: 'approved', html_url: 'https://dev-null.sh/c1' };

const preview = {
  body: 'Run `npm i`\n\n@laravel',
  body_segments: [
    { type: 'text', text: 'Run ' },
    { type: 'code', code: 'npm i' },
    { type: 'text', text: '\n\n@laravel' },
  ],
  preview_segments: null,
  mentions: [{ handle: 'laravel', offset: 13, length: 8, kind: 'organization' }],
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

async function type(text: string) {
  const textarea = root.querySelector('textarea')!;
  await act(async () => {
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Opens the Preview tab, then lets the preview request answer. */
async function openPreview() {
  await act(async () => tab('Preview').click());
  await act(async () => {});
}

const tab = (name: string) => [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((element) => element.textContent === name)!;

describe('InlineComposer', () => {
  it("has GitHub's Write and Preview tabs, Write first", () => {
    expect([...root.querySelectorAll('[role="tab"]')].map((element) => element.textContent)).toEqual(['Write', 'Preview']);
    expect(tab('Write').getAttribute('aria-selected')).toBe('true');
  });

  it('previews the commit as /dev/null will render it in the Preview tab', async () => {
    await type('Run `npm i`');
    await openPreview();

    expect(ask).toHaveBeenLastCalledWith({ type: 'preview', body: 'Run `npm i`\n\n@laravel' });
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
    await type('Shipped 🚀');

    expect(root.textContent).toContain('19 / 4000');
  });

  it('says what it adds to the commit, and lets the user remove it and put it back', async () => {
    await type('Shipped');
    const additions = root.querySelector('[data-additions]');
    expect(additions?.textContent).toContain('Added to your commit');
    expect(additions?.textContent).toContain('@laravel');
    expect(additions?.textContent).toContain("so the commit shows on the organization's /dev/null page");
    expect(root.textContent).toContain('17 / 4000');

    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Remove @laravel from your commit"]')!.click());
    expect(root.textContent).toContain('7 / 4000');

    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Add @laravel back to your commit"]')!.click());
    expect(root.textContent).toContain('17 / 4000');
  });

  it('commits without the mention once removed', async () => {
    await type('Shipped');
    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Remove @laravel from your commit"]')!.click());
    await act(async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(ask).toHaveBeenLastCalledWith({ type: 'commit', body: 'Shipped' });
  });

  it("says what /dev/null's commits support", () => {
    expect(root.textContent).toContain('Links, @mentions, :emoji: and `code` are supported');
  });

  it('commits, hands the commit to the log and clears the draft for the next one', async () => {
    await type('Shipped');
    await act(async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(ask).toHaveBeenLastCalledWith({ type: 'commit', body: 'Shipped\n\n@laravel' });
    expect(onCommitted).toHaveBeenCalledWith(committed);
    expect(root.querySelector('textarea')?.value).toBe('');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent).toBe('Commit');
  });
});
