import { describe, expect, it } from 'vitest';
import { DevNullClient } from '../src/client.ts';
import type { ApiError } from '../src/errors.ts';
import { fakeClock, fakeFetch, fixtureSigner } from './helpers.ts';

async function clientWith(responses: Array<[number, unknown]>) {
  const fetch = fakeFetch(responses);
  return { fetch, client: new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() }) };
}

const user = (handle: string) => ({ id: handle, handle, name: null, avatar_url: null, bio: null, github_url: '', html_url: '' });

describe('follows', () => {
  it('follows a user by their handle, signed', async () => {
    const { fetch, client } = await clientWith([[204, null]]);

    await client.follow('A5hleyRich');

    expect(fetch.requests[0]?.method).toBe('POST');
    expect(fetch.requests[0]?.url.pathname).toBe('/api/v1/users/A5hleyRich/follow');
    expect(fetch.requests[0]?.headers['X-SSH-Signature']).toBeDefined();
  });

  it('unfollows a user by their handle, signed', async () => {
    const { fetch, client } = await clientWith([[204, null]]);

    await client.unfollow('A5hleyRich');

    expect(fetch.requests[0]?.method).toBe('DELETE');
    expect(fetch.requests[0]?.url.pathname).toBe('/api/v1/users/A5hleyRich/follow');
  });

  it("says when the user isn't on /dev/null", async () => {
    const { client } = await clientWith([[404, { message: 'Not found.' }]]);

    await expect(client.follow('nobody')).rejects.toMatchObject({ status: 404 } satisfies Partial<ApiError>);
  });

  it('lists the handles a user follows, lowercased, across every page', async () => {
    const { fetch, client } = await clientWith([
      [200, { data: [user('NunoMaduro'), user('taylorotwell')], meta: { next_cursor: 'c2' } }],
      [200, { data: [user('A5hleyRich')], meta: { next_cursor: null } }],
    ]);

    const handles = await client.followingHandles('jubianchi');

    expect([...handles]).toEqual(['nunomaduro', 'taylorotwell', 'a5hleyrich']);
    expect(fetch.requests.map((request) => request.url.pathname + request.url.search)).toEqual([
      '/api/v1/users/jubianchi/following',
      '/api/v1/users/jubianchi/following?cursor=c2',
    ]);
  });
});
