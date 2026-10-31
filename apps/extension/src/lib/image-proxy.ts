import { SERVER } from './server.ts';

const IMAGE_ORIGIN = SERVER;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * A commit image as a data URL. github.com's CSP only lets its pages load images from GitHub's hosts, `data:` and
 * `blob:`, so the background fetches them. Only from dev-null.sh, and only the types it stores: this never fetches
 * whatever a page asks for.
 */
export async function fetchImageAsDataUrl(
  url: string,
  fetch: (url: string, init: RequestInit) => Promise<Response> = globalThis.fetch.bind(globalThis),
): Promise<string> {
  if (new URL(url).origin !== IMAGE_ORIGIN) throw new Error(`Not a /dev/null image: ${url}`);

  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`The image answered ${response.status}.`);

  const type = (response.headers.get('Content-Type') ?? '').split(';')[0]?.trim() ?? '';
  if (!IMAGE_TYPES.has(type)) throw new Error(`Not an image /dev/null stores: ${type}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return `data:${type};base64,${btoa(binary)}`;
}
