import { describe, expect, it } from 'vitest';
import { DevNullClient } from '../src/client.ts';
import { buffer, fromBase64, toHex } from '../src/encoding.ts';
import { IMAGES_NAMESPACE, signatureHeaders, signedMessage } from '../src/signed-request.ts';
import { fakeClock, fakeFetch, fixtureSigner } from './helpers.ts';

async function sha256(bytes: Uint8Array): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer(bytes))));
}

/** The namespace an SSHSIG blob was signed under, read from the signature header's base64 blob. */
function namespaceOf(signatureBase64: string): string {
  const blob = fromBase64(signatureBase64);
  const view = new DataView(blob.buffer, blob.byteOffset);
  // "SSHSIG", version, then the public key and the namespace as SSH strings.
  let offset = 6 + 4;
  const keyLength = view.getUint32(offset);
  offset += 4 + keyLength;
  const namespaceLength = view.getUint32(offset);
  return new TextDecoder().decode(blob.slice(offset + 4, offset + 4 + namespaceLength));
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 4, 5, 6]);

describe('signed requests with images', () => {
  it('signs the images’ hashes on a line of their own, before the payload', () => {
    expect(signedMessage({ method: 'post', pathAndQuery: '/api/v1/commits', body: '{"body":"hi"}', hashes: 'aa,bb' }, '1761832800', 'n0nce')).toBe(
      '1761832800\nn0nce\nPOST\n/api/v1/commits\naa,bb\n{"body":"hi"}',
    );
  });

  it('signs them under the images namespace', async () => {
    const headers = await signatureHeaders(
      await fixtureSigner(),
      { method: 'POST', pathAndQuery: '/api/v1/commits', body: '{}', hashes: 'aa' },
      1_761_832_800_000,
    );

    expect(namespaceOf(headers['X-SSH-Signature'] ?? '')).toBe(IMAGES_NAMESPACE);
    expect(IMAGES_NAMESPACE).toBe('devnull-api-images');
  });

  it('keeps the JSON namespace for a request without images', async () => {
    const headers = await signatureHeaders(await fixtureSigner(), { method: 'POST', pathAndQuery: '/api/v1/commits', body: '{}' }, 1_761_832_800_000);

    expect(namespaceOf(headers['X-SSH-Signature'] ?? '')).toBe('devnull-api');
  });
});

describe('createCommit with images', () => {
  it('sends a multipart request: the JSON as a payload file, the images in order, their descriptions in the JSON', async () => {
    const fetch = fakeFetch([[201, { data: { id: 'c1' } }]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    await client.createCommit({ body: 'Shipped' }, [
      { bytes: png, type: 'image/png', description: 'The new popup' },
      { bytes: jpeg, type: 'image/jpeg', description: null },
    ]);

    const [request] = fetch.requests;
    const payload = request?.form?.get('payload');
    const images = request?.form?.getAll('images[]') ?? [];

    expect(request?.method).toBe('POST');
    expect(request?.url.pathname).toBe('/api/v1/commits');
    expect(payload).toBeInstanceOf(File);
    expect((payload as File).name).toBe('payload');
    expect(JSON.parse(await (payload as File).text())).toEqual({ body: 'Shipped', image_descriptions: ['The new popup', null] });
    expect(images.map((image) => (image as File).type)).toEqual(['image/png', 'image/jpeg']);
    expect(new Uint8Array(await (images[0] as File).arrayBuffer())).toEqual(png);
    const fields: string[] = [];
    request?.form?.forEach((_value, field) => fields.push(field));
    expect(fields.sort()).toEqual(['images[]', 'images[]', 'payload']);
    expect(request?.headers['Content-Type']).toBeUndefined();
    expect(namespaceOf(request?.headers['X-SSH-Signature'] ?? '')).toBe(IMAGES_NAMESPACE);
  });

  it("signs the payload part's exact bytes and the images' hashes, in order", async () => {
    const fetch = fakeFetch([[201, { data: { id: 'c1' } }]]);
    const signer = await fixtureSigner();
    const client = new DevNullClient({ signer, fetch, clock: fakeClock() });

    await client.createCommit({ body: 'Shipped' }, [
      { bytes: png, type: 'image/png' },
      { bytes: jpeg, type: 'image/jpeg' },
    ]);

    // Ed25519 is deterministic: the same message signed with the same key gives the same signature.
    const [request] = fetch.requests;
    const expected = await signatureHeaders(
      signer,
      {
        method: 'POST',
        pathAndQuery: '/api/v1/commits',
        body: await (request?.form?.get('payload') as File).text(),
        hashes: `${await sha256(png)},${await sha256(jpeg)}`,
      },
      1_761_832_800_000,
      request?.headers['X-Devnull-Nonce'],
    );
    expect(request?.headers['X-SSH-Signature']).toBe(expected['X-SSH-Signature']);
  });

  it('sends JSON as before without images', async () => {
    const fetch = fakeFetch([[201, { data: { id: 'c1' } }]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    await client.createCommit({ body: 'Shipped' });

    expect(fetch.requests[0]?.body).toBe('{"body":"Shipped"}');
    expect(fetch.requests[0]?.form).toBeUndefined();
  });
});
