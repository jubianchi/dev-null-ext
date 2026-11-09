import { describe, expect, it } from 'vitest';
import { DevNullClient, scheduledAt } from '../src/client.ts';
import type { ApiError } from '../src/errors.ts';
import type { ScheduledCommit } from '../src/types.ts';
import { fakeClock, fakeFetch, fixtureSigner } from './helpers.ts';

async function clientWith(responses: Array<[number, unknown]>) {
  const fetch = fakeFetch(responses);
  return { fetch, client: new DevNullClient({ signer: await fixtureSigner(), fetch, clock: fakeClock() }) };
}

const scheduled: ScheduledCommit = {
  id: 's1',
  author: null,
  body: 'Shipped',
  scheduled_at: '2026-11-10T14:00:00+00:00',
  submitted_at: null,
  status: 'scheduled',
  poll_options: null,
  image_count: 0,
};

const at = new Date('2026-11-10T14:00:00.000Z');

describe('scheduledAt', () => {
  it('writes the date as /dev/null validates it: seconds, no milliseconds, an offset rather than Z', () => {
    expect(scheduledAt(new Date('2026-11-10T14:05:07.123Z'))).toBe('2026-11-10T14:05:07+00:00');
  });
});

describe('scheduleCommit', () => {
  it('schedules a commit, signed, with its date', async () => {
    const { fetch, client } = await clientWith([[201, { data: scheduled }]]);

    const answer = await client.scheduleCommit({ body: 'Shipped' }, at);

    expect(fetch.requests[0]?.method).toBe('POST');
    expect(fetch.requests[0]?.url.pathname).toBe('/api/v1/scheduled-commits');
    expect(JSON.parse(fetch.requests[0]?.body ?? '')).toEqual({ body: 'Shipped', scheduled_at: '2026-11-10T14:00:00+00:00' });
    expect(fetch.requests[0]?.headers['X-SSH-Signature']).toBeDefined();
    expect(answer).toEqual(scheduled);
  });

  it('schedules a poll', async () => {
    const { fetch, client } = await clientWith([[201, { data: scheduled }]]);

    await client.scheduleCommit({ body: 'Tabs or spaces?', poll: { options: ['Tabs', 'Spaces'], duration: 60 } }, at);

    expect(JSON.parse(fetch.requests[0]?.body ?? '')).toEqual({
      body: 'Tabs or spaces?',
      poll: { options: ['Tabs', 'Spaces'], duration: 60 },
      scheduled_at: '2026-11-10T14:00:00+00:00',
    });
  });

  it('schedules images as a commit sends them: multipart, their descriptions in the payload', async () => {
    const { fetch, client } = await clientWith([[201, { data: scheduled }]]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

    await client.scheduleCommit({ body: '' }, at, [{ bytes: png, type: 'image/png', description: 'The popup' }]);

    const form = fetch.requests[0]?.form;
    const payload = form?.get('payload') as File;
    expect(JSON.parse(await payload.text())).toEqual({ body: '', scheduled_at: '2026-11-10T14:00:00+00:00', image_descriptions: ['The popup'] });
    expect(form?.getAll('images[]')).toHaveLength(1);
  });

  it('says why /dev/null refuses it, as the limit of 10 waiting', async () => {
    const message = 'You can have up to 10 scheduled commits. Cancel one before scheduling another.';
    const { client } = await clientWith([[422, { message, errors: { scheduled_at: [message] } }]]);

    await expect(client.scheduleCommit({ body: 'Shipped' }, at)).rejects.toMatchObject({ status: 422, code: null, message } satisfies Partial<ApiError>);
  });
});
