import { describe, expect, it } from 'vitest';
import { DevNullClient } from '../src/client.ts';
import type { ApiError } from '../src/errors.ts';
import { type Commit, POLL_DURATIONS, type Poll } from '../src/types.ts';
import { fakeClock, fakeFetch, fixtureSigner } from './helpers.ts';

async function clientWith(responses: Array<[number, unknown]>) {
  const fetch = fakeFetch(responses);
  return { fetch, client: new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() }) };
}

const poll: Poll = {
  id: 'p1',
  closes_at: '2026-11-02T10:00:00.000000Z',
  is_closed: false,
  has_voted: true,
  total_votes: 3,
  options: [
    { id: 'o1', label: 'Tabs', votes_count: 2, voted: true, percentage: 67 },
    { id: 'o2', label: 'Spaces', votes_count: 1, voted: false, percentage: 33 },
  ],
};

const commit: Commit = {
  id: 'c1',
  short_hash: 'abc1234',
  body: 'Tabs or spaces?',
  parent_id: null,
  html_url: 'https://dev-null.sh/@jubianchi/commits/c1',
  created_at: '2026-11-01T10:00:00Z',
  author: { id: '1', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '' },
  poll,
};

describe('polls', () => {
  it('votes for an option, signed, and returns the commit with the results', async () => {
    const { fetch, client } = await clientWith([[200, { data: commit }]]);

    const voted = await client.vote('c1', 'o1');

    expect(fetch.requests[0]?.method).toBe('POST');
    expect(fetch.requests[0]?.url.pathname).toBe('/api/v1/commits/c1/poll/votes');
    expect(JSON.parse(fetch.requests[0]?.body ?? '')).toEqual({ option: 'o1' });
    expect(fetch.requests[0]?.headers['X-SSH-Signature']).toBeDefined();
    expect(voted.poll).toEqual(poll);
  });

  it('commits with a poll: its options and its duration in minutes, in the JSON', async () => {
    const { fetch, client } = await clientWith([[201, { data: commit }]]);

    const created = await client.createCommit({ body: 'Tabs or spaces?', poll: { options: ['Tabs', 'Spaces'], duration: 1440 } });

    expect(fetch.requests[0]?.url.pathname).toBe('/api/v1/commits');
    expect(JSON.parse(fetch.requests[0]?.body ?? '')).toEqual({ body: 'Tabs or spaces?', poll: { options: ['Tabs', 'Spaces'], duration: 1440 } });
    expect(created.poll).toEqual(poll);
  });

  it('lasts 1 hour, 1, 3 or 7 days', () => {
    expect(POLL_DURATIONS).toEqual([60, 1440, 4320, 10080]);
  });

  it('says why a vote is refused', async () => {
    const { client } = await clientWith([[422, { message: 'This poll has closed.', errors: { option: ['This poll has closed.'] } }]]);

    await expect(client.vote('c1', 'o1')).rejects.toMatchObject({ status: 422, message: 'This poll has closed.' } satisfies Partial<ApiError>);
  });
});
