import { beforeEach, describe, expect, it } from 'vitest';
import type { Stash } from '../src/lib/stash.ts';
import { type KeyValue, Stashes } from '../src/lib/stash-store.ts';

function memory<T>(): KeyValue<T> & { map: Map<string, T> } {
  const map = new Map<string, T>();
  return {
    map,
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => {
      map.set(key, value);
    },
    remove: async (keys) => {
      for (const key of keys) map.delete(key);
    },
    keys: async () => [...map.keys()],
  };
}

const png = { id: 'img-1', type: 'image/png', name: 'diagram.png', description: 'A diagram' };

let texts: ReturnType<typeof memory<Stash>>;
let images: ReturnType<typeof memory<string>>;
let stashes: Stashes;

beforeEach(() => {
  texts = memory();
  images = memory();
  stashes = new Stashes({ texts, images });
});

describe('Stashes', () => {
  it('has no stash for a context nothing was written in', async () => {
    expect(await stashes.get('reply-01J0')).toBeNull();
  });

  it('keeps the text and the images, with their bytes, and gives them back', async () => {
    await stashes.put('reply-01J0', 'Nice one', [{ ...png, data: 'iVBORw0K' }]);

    expect(await stashes.get('reply-01J0')).toEqual({ text: 'Nice one', images: [{ ...png, data: 'iVBORw0K' }] });
  });

  it('keeps an image already stored when only its description changes, its bytes not sent again', async () => {
    await stashes.put('reply-01J0', 'Nice one', [{ ...png, data: 'iVBORw0K' }]);
    await stashes.put('reply-01J0', 'Nice one!', [{ ...png, description: 'The diagram' }]);

    expect(await stashes.get('reply-01J0')).toEqual({ text: 'Nice one!', images: [{ ...png, description: 'The diagram', data: 'iVBORw0K' }] });
  });

  it('forgets the bytes of an image removed from the stash', async () => {
    await stashes.put('reply-01J0', 'Nice one', [{ ...png, data: 'iVBORw0K' }]);
    await stashes.put('reply-01J0', 'Nice one', []);

    expect(images.map.size).toBe(0);
    expect(await stashes.get('reply-01J0')).toEqual({ text: 'Nice one', images: [] });
  });

  it('leaves out an image whose bytes are lost', async () => {
    await stashes.put('reply-01J0', 'Nice one', [{ ...png, data: 'iVBORw0K' }]);
    images.map.clear();

    expect(await stashes.get('reply-01J0')).toEqual({ text: 'Nice one', images: [] });
  });

  it('drops a stash put empty, and one dropped, with its images', async () => {
    await stashes.put('reply-01J0', 'Nice one', [{ ...png, data: 'iVBORw0K' }]);
    await stashes.put('reply-01J0', '  ', []);
    expect(await stashes.get('reply-01J0')).toBeNull();
    expect(images.map.size).toBe(0);

    await stashes.put('quote-01J1', 'Indeed', [{ ...png, data: 'iVBORw0K' }]);
    await stashes.drop('quote-01J1');
    expect(await stashes.get('quote-01J1')).toBeNull();
    expect(images.map.size).toBe(0);
  });

  it('tells which of the names asked have a stash', async () => {
    await stashes.put('reply-01J0', 'Nice one', []);

    expect(await stashes.which(['reply-01J0', 'quote-01J0'])).toEqual({ 'reply-01J0': true });
  });

  it('forgets every stash, and nothing else in storage', async () => {
    await stashes.put('reply-01J0', 'Nice one', [{ ...png, data: 'iVBORw0K' }]);
    await stashes.put('page:https://github.com/dev-null-sh/dev-null.sh', 'Look', []);
    texts.map.set('settings', { text: 'not a stash', images: [] });

    await stashes.clear();

    expect([...texts.map.keys()]).toEqual(['settings']);
    expect(images.map.size).toBe(0);
  });
});
