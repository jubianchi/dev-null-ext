import { describe, expect, it } from 'vitest';
import { DevNullClient } from '../src/client.ts';
import { createNonce, signedMessage, signatureHeaders } from '../src/signed-request.ts';
import { fakeClock, fakeFetch, fixture, fixtureSigner } from './helpers.ts';

describe('signed requests', () => {
  it('signs the message the server rebuilds: timestamp, nonce, method, path and query, body', () => {
    expect(
      signedMessage({ method: 'post', pathAndQuery: '/api/v1/commits', body: '{"body":"hello from the extension @laravel"}' }, '1761832800', '0123456789abcdef0123456789abcdef'),
    ).toBe(fixture.message);
  });

  it('makes nonces of 32 lowercase hex characters', () => {
    expect(createNonce()).toMatch(/^[0-9a-f]{32}$/);
    expect(createNonce()).not.toBe(createNonce());
  });

  it('puts the timestamp, the nonce and the one-line signature in the headers', async () => {
    const headers = await signatureHeaders(
      await fixtureSigner(),
      { method: 'POST', pathAndQuery: '/api/v1/commits', body: '{"body":"hello from the extension @laravel"}' },
      1_761_832_800_999,
      '0123456789abcdef0123456789abcdef',
    );

    expect(headers).toEqual({
      'X-Devnull-Timestamp': '1761832800',
      'X-Devnull-Nonce': '0123456789abcdef0123456789abcdef',
      'X-SSH-Signature': fixture.signatureBase64,
    });
  });

  it('sends exactly the body and the path and query it signed', async () => {
    const fetch = fakeFetch([[200, { data: [], meta: { next_cursor: null } }]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    await client.organizationMentions('laravel', 'eyJpZCI6MX0');

    const [request] = fetch.requests;
    expect(request?.url.pathname + request!.url.search).toBe('/api/v1/organizations/laravel/mentions?cursor=eyJpZCI6MX0');
    expect(request?.headers['X-SSH-Signature']).toBeTypeOf('string');
    expect(request?.body).toBe('');
  });

  it('reads public endpoints unsigned without a key', async () => {
    const fetch = fakeFetch([[200, { data: [], meta: { next_cursor: null } }]]);
    await new DevNullClient({ fetch }).organizationMentions('laravel');

    expect(fetch.requests[0]?.headers['X-SSH-Signature']).toBeUndefined();
  });

  it('turns API errors into ApiError with their code', async () => {
    const fetch = fakeFetch([[403, { message: 'Accept the commit rules on the web first.', code: 'commit_rules_required' }]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    await expect(client.createCommit({ body: 'hi' })).rejects.toMatchObject({ status: 403, code: 'commit_rules_required' });
  });
});
