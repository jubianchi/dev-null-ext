// @vitest-environment happy-dom
import { render } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A build made with WXT_DEVNULL_URL=http://localhost:8000 (see CONTRIBUTING.md).
vi.mock('../src/lib/server.ts', async (original) => ({ ...(await original<typeof import('../src/lib/server.ts')>()), SERVER: 'http://localhost:8000' }));

const { fetchImageAsDataUrl } = await import('../src/lib/image-proxy.ts');
const { CommitBody } = await import('../src/components/CommitBody.tsx');

afterEach(() => {
  document.body.replaceChildren();
});

describe('a build for a development server', () => {
  it('fetches commit images from that server, and from it only', async () => {
    const fetch = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }));

    expect(await fetchImageAsDataUrl('http://localhost:8000/commit-images/abc', fetch)).toBe('data:image/png;base64,AQID');
    await expect(fetchImageAsDataUrl('https://dev-null.sh/commit-images/abc', fetch)).rejects.toThrow('Not a /dev/null image');
  });

  it("links mentions to that server's profiles", () => {
    const root = document.createElement('div');
    document.body.append(root);
    render(
      <CommitBody segments={[{ type: 'text', text: 'Thanks @laravel' }]} mentions={[{ handle: 'laravel', offset: 7, length: 8, kind: 'organization' }]} />,
      root,
    );

    expect(root.querySelector('a')?.getAttribute('href')).toBe('http://localhost:8000/@laravel');
  });
});
