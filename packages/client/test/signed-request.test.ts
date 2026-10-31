import { describe, expect, it } from 'vitest';
import { DevNullClient } from '../src/client.ts';
import { createNonce, signatureHeaders, signedMessage } from '../src/signed-request.ts';
import { fakeClock, fakeFetch, fixture, fixtureSigner } from './helpers.ts';

describe('signed requests', () => {
  it('signs the message the server rebuilds: timestamp, nonce, method, path and query, body', () => {
    expect(
      signedMessage(
        { method: 'post', pathAndQuery: '/api/v1/commits', body: '{"body":"hello from the extension @laravel"}' },
        '1761832800',
        '0123456789abcdef0123456789abcdef',
      ),
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

  it("previews a commit's body, signed, as /dev/null will render it", async () => {
    const preview = {
      body: 'Shipped `npm i`',
      body_segments: [
        { type: 'text', text: 'Shipped ' },
        { type: 'code', code: 'npm i' },
      ],
      preview_segments: null,
      mentions: [],
    };
    const fetch = fakeFetch([[200, { data: preview }]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    expect(await client.previewCommit('Shipped `npm i`')).toEqual(preview);

    const [request] = fetch.requests;
    expect(request?.method).toBe('POST');
    expect(request?.url.pathname).toBe('/api/v1/commits/preview');
    expect(request?.body).toBe('{"body":"Shipped `npm i`"}');
    expect(request?.headers['X-SSH-Signature']).toBeTypeOf('string');
  });

  it("asks who to mention, signed, as dev-null.sh's composer does", async () => {
    const user = { id: 'u1', handle: 'nunomaduro', name: 'Nuno Maduro', avatar_url: null, bio: null, github_url: '', html_url: '', lane: 2 };
    const organization = { handle: 'laravel', name: 'Laravel', avatar_url: null, bio: null, github_url: '', html_url: '', lane: null };
    const fetch = fakeFetch([[200, { data: [user], organizations: [organization] }]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    expect(await client.mentionSuggestions('nu')).toEqual({ users: [user], organizations: [organization] });

    const [request] = fetch.requests;
    expect(request?.method).toBe('GET');
    expect(request?.url.pathname + request!.url.search).toBe('/api/v1/search/mentions?q=nu');
    expect(request?.headers['X-SSH-Signature']).toBeTypeOf('string');
  });

  it("pages a commit's replies, newest first to follow its reply preview, signed", async () => {
    const page = { data: [], meta: { next_cursor: null } };
    const fetch = fakeFetch([[200, page]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    expect(await client.commitReplies('c1', { cursor: 'eyJpZCI6MX0', newest: true })).toEqual(page);

    const [request] = fetch.requests;
    expect(request?.url.pathname + request!.url.search).toBe('/api/v1/commits/c1/replies?newest=1&cursor=eyJpZCI6MX0');
    expect(request?.headers['X-SSH-Signature']).toBeTypeOf('string');
  });

  it('turns API errors into ApiError with their code', async () => {
    const fetch = fakeFetch([[403, { message: 'Accept the commit rules on the web first.', code: 'commit_rules_required' }]]);
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() });

    await expect(client.createCommit({ body: 'hi' })).rejects.toMatchObject({ status: 403, code: 'commit_rules_required' });
  });
});
