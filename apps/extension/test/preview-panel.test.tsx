// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { PreviewPanel } = await import('../src/components/PreviewPanel.tsx');

const attached = (id: string, description = '') => ({
  id,
  file: new File([new Uint8Array([1])], `${id}.png`, { type: 'image/png' }),
  url: `blob:https://github.com/${id}`,
  description,
});

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  ask.mockResolvedValue({ body: 'Shipped', body_segments: [{ type: 'text', text: 'Shipped' }], preview_segments: null, mentions: [] });
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(body: string, images: ReturnType<typeof attached>[]) {
  await act(async () => {
    render(<PreviewPanel body={body} images={images} />, root);
  });
  await act(async () => {});
}

describe('PreviewPanel, images', () => {
  it('shows the attached images under the text, laid out as /dev/null will publish them', async () => {
    await show('Shipped', [attached('a', 'The new popup'), attached('b'), attached('c')]);

    const images = [...root.querySelectorAll('img')];
    expect(root.textContent).toContain('Shipped');
    expect(images.map((image) => image.getAttribute('src'))).toEqual(['blob:https://github.com/a', 'blob:https://github.com/b', 'blob:https://github.com/c']);
    expect(images.map((image) => image.getAttribute('alt'))).toEqual(['The new popup', 'Attached image 2 of 3', 'Attached image 3 of 3']);
    expect(images[0]?.closest('[class*="row-span-2"]')).not.toBeNull();
    for (const image of images) expect(image.className).toContain('object-cover');
  });

  it('previews images alone, without text', async () => {
    await show('', [attached('a')]);

    expect(root.textContent).not.toContain('Nothing to preview');
    expect(root.querySelector('img')?.getAttribute('src')).toBe('blob:https://github.com/a');
    expect(ask).not.toHaveBeenCalled();
  });

  it('has nothing to preview without text nor images', async () => {
    await show('', []);

    expect(root.textContent).toContain('Nothing to preview');
  });
});
