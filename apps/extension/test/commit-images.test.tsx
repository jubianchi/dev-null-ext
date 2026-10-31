// @vitest-environment happy-dom
import type { CommitImage } from '@dev-null-ext/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { CommitImages } = await import('../src/components/CommitImages.tsx');

const image = (id: string, description: string | null = null): CommitImage => ({
  id,
  width: 1200,
  height: 800,
  description,
  url: `https://dev-null.sh/commit-images/${id}`,
});

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  ask.mockImplementation(async (request: { url: string }) => `data:image/png;base64,${request.url.slice(-1)}`);
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(images: CommitImage[]) {
  await act(async () => {
    render(<CommitImages images={images} hash="abc1234" link="https://dev-null.sh/c1" />, root);
  });
  await act(async () => {});
}

describe('CommitImages', () => {
  it('loads each image through the background, which github.com allows as a data URL', async () => {
    await show([image('a'), image('b')]);

    expect(ask).toHaveBeenCalledWith({ type: 'image', url: 'https://dev-null.sh/commit-images/a' });
    expect([...root.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual(['data:image/png;base64,a', 'data:image/png;base64,b']);
  });

  it('describes each image, or numbers it when it has no description', async () => {
    await show([image('a', 'A deploy log'), image('b'), image('c')]);

    expect([...root.querySelectorAll('img')].map((img) => img.getAttribute('alt'))).toEqual(['A deploy log', 'Attached image 2 of 3', 'Attached image 3 of 3']);
  });

  it('lays three images out as one tall image beside two', async () => {
    await show([image('a'), image('b'), image('c')]);

    expect(root.querySelector('a')?.className).toContain('row-span-2');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('https://dev-null.sh/c1');
  });

  it('fills each cell of the grid, cropping a portrait image as dev-null.sh does', async () => {
    await show([{ ...image('a'), width: 800, height: 1200 }, image('b'), image('c')]);

    for (const img of root.querySelectorAll('img')) expect(img.className).toContain('object-cover');
  });

  it('draws plain images, not links, inside a link such as a quoted commit', async () => {
    await act(async () => {
      render(<CommitImages images={[image('a')]} hash="abc1234" link={null} />, root);
    });

    expect(root.querySelector('a')).toBeNull();
  });

  it('keeps the place of an image that fails to load, showing the hash', async () => {
    ask.mockRejectedValue(new Error('offline'));
    await show([image('a')]);

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('abc1234');
  });
});
