import type { Clock } from '../src/clock.ts';
import { buffer, fromBase64 } from '../src/encoding.ts';
import { ED25519, fingerprint, publicKeyBlob } from '../src/keys.ts';
import type { Signer } from '../src/signer.ts';
import fixture from './fixtures/ssh-keygen-ed25519.json' with { type: 'json' };

export { fixture };

export function fromBase64Url(text: string): Uint8Array {
  const padded = text.replaceAll('-', '+').replaceAll('_', '/');
  return fromBase64(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

/** The fixture's key, imported as the extension imports nothing: non-extractable, sign only. */
export async function fixtureSigner(): Promise<Signer> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'OKP', crv: 'Ed25519', d: fixture.privateSeedBase64Url, x: fixture.publicRawBase64Url },
    ED25519,
    false,
    ['sign'],
  );
  const blob = publicKeyBlob(fromBase64Url(fixture.publicRawBase64Url));

  return {
    publicKeyBlob: blob,
    fingerprint: await fingerprint(blob),
    sign: async (data) => new Uint8Array(await crypto.subtle.sign(ED25519, privateKey, buffer(data))),
  };
}

/** A clock that never waits, and remembers how long it was asked to. */
export function fakeClock(start = 1_761_832_800_000): Clock & { slept: number[] } {
  let now = start;
  const slept: number[] = [];
  return {
    slept,
    now: () => now,
    sleep: async (milliseconds) => {
      slept.push(milliseconds);
      now += milliseconds;
    },
  };
}

export interface RecordedRequest {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: string;
  /** A multipart request's parts. */
  form?: FormData;
}

/** A fetch that answers from a queue and records what it was sent. */
export function fakeFetch(responses: Array<[number, unknown]>): typeof fetch & { requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      method: init?.method ?? 'GET',
      url: new URL(input.toString()),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? init.body : '',
      ...(init?.body instanceof FormData ? { form: init.body } : {}),
    });
    const next = responses.shift();
    if (!next) throw new Error('No more fake responses.');
    const [status, payload] = next;
    return new Response(status === 204 ? null : JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch & { requests: RecordedRequest[] };
  fn.requests = requests;
  return fn;
}
