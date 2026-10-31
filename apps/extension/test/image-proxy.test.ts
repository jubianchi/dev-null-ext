import { describe, expect, it, vi } from 'vitest';
import { fetchImageAsDataUrl } from '../src/lib/image-proxy.ts';

function answering(body: Uint8Array<ArrayBuffer>, type: string, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status, headers: { 'Content-Type': type } }));
}

describe('fetchImageAsDataUrl', () => {
  it("turns a commit image from dev-null.sh into a data URL, which github.com's CSP allows", async () => {
    const fetch = answering(new Uint8Array([1, 2, 3]), 'image/png');

    expect(await fetchImageAsDataUrl('https://dev-null.sh/commit-images/abc', fetch)).toBe('data:image/png;base64,AQID');
    expect(fetch).toHaveBeenCalledWith('https://dev-null.sh/commit-images/abc', { credentials: 'omit' });
  });

  it('fetches nothing but dev-null.sh over HTTPS', async () => {
    const fetch = answering(new Uint8Array([1]), 'image/png');

    await expect(fetchImageAsDataUrl('https://evil.example/x.png', fetch)).rejects.toThrow();
    await expect(fetchImageAsDataUrl('http://dev-null.sh/commit-images/abc', fetch)).rejects.toThrow();
    await expect(fetchImageAsDataUrl('https://dev-null.sh.evil.example/x', fetch)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts only the image types /dev/null stores', async () => {
    await expect(fetchImageAsDataUrl('https://dev-null.sh/commit-images/abc', answering(new Uint8Array([1]), 'image/svg+xml'))).rejects.toThrow();
    await expect(fetchImageAsDataUrl('https://dev-null.sh/commit-images/abc', answering(new Uint8Array([1]), 'image/webp'))).resolves.toMatch(
      /^data:image\/webp;base64,/,
    );
  });

  it('fails on an error status', async () => {
    await expect(fetchImageAsDataUrl('https://dev-null.sh/commit-images/abc', answering(new Uint8Array(), 'text/html', 404))).rejects.toThrow();
  });
});
