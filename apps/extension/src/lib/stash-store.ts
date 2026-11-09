import { browser } from 'wxt/browser';
import { isEmptyStash, type Stash, type StashedImage } from './stash.ts';

/** A stash's image as it travels: its bytes in base64, sent once, when the image is new to the stash. */
export type StashImageInput = StashedImage & { data?: string };

/** A stash as it comes back to its composer, every image with its bytes. */
export interface RestoredStash {
  text: string;
  images: (StashedImage & { data: string })[];
  scheduledAt?: string;
}

export interface KeyValue<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  remove(keys: string[]): Promise<void>;
  keys(): Promise<string[]>;
}

const PREFIX = 'stash:';

/**
 * The stashes, kept by the background: the text and the images' descriptions in the extension's storage, the images'
 * bytes in its IndexedDB. A content script's own storage would be github.com's.
 */
export class Stashes {
  readonly #texts: KeyValue<Stash>;
  readonly #images: KeyValue<string>;

  constructor({ texts, images }: { texts: KeyValue<Stash>; images: KeyValue<string> }) {
    this.#texts = texts;
    this.#images = images;
  }

  async get(name: string): Promise<RestoredStash | null> {
    const stash = await this.#texts.get(PREFIX + name);
    if (!stash) return null;

    const images = await Promise.all(
      stash.images.map(async (image) => {
        const data = await this.#images.get(imageKey(name, image.id));
        return data === null ? null : { ...image, data };
      }),
    );

    return {
      text: stash.text,
      images: images.filter((image) => image !== null),
      ...(stash.scheduledAt ? { scheduledAt: stash.scheduledAt } : {}),
    };
  }

  /** Keeps the stash as the composer shows it; an empty one is dropped. */
  async put(name: string, text: string, images: StashImageInput[], scheduledAt?: string): Promise<void> {
    const stash: Stash = {
      text,
      images: images.map(({ id, type, name: file, description }) => ({ id, type, name: file, description })),
      ...(scheduledAt ? { scheduledAt } : {}),
    };
    if (isEmptyStash(stash)) return this.drop(name);

    const previous = await this.#texts.get(PREFIX + name);
    const kept = new Set(stash.images.map((image) => image.id));
    await this.#images.remove((previous?.images ?? []).filter((image) => !kept.has(image.id)).map((image) => imageKey(name, image.id)));
    for (const image of images) if (image.data !== undefined) await this.#images.set(imageKey(name, image.id), image.data);

    await this.#texts.set(PREFIX + name, stash);
  }

  async drop(name: string): Promise<void> {
    const previous = await this.#texts.get(PREFIX + name);
    await this.#images.remove((previous?.images ?? []).map((image) => imageKey(name, image.id)));
    await this.#texts.remove([PREFIX + name]);
  }

  /** Which of the names have a stash, keyed as asked. */
  async which(names: string[]): Promise<Record<string, true>> {
    const stored = new Set(await this.#texts.keys());
    return Object.fromEntries(names.filter((name) => stored.has(PREFIX + name)).map((name) => [name, true]));
  }

  /** Forgets every stash: they belong to the user signing out. */
  async clear(): Promise<void> {
    await this.#texts.remove((await this.#texts.keys()).filter((key) => key.startsWith(PREFIX)));
    await this.#images.remove(await this.#images.keys());
  }
}

function imageKey(name: string, id: string): string {
  return `${name}/${id}`;
}

/** The extension's local storage. */
export function localStorageArea<T>(): KeyValue<T> {
  const area = browser.storage.local;
  return {
    get: async (key) => ((await area.get(key))[key] as T | undefined) ?? null,
    set: (key, value) => area.set({ [key]: value }),
    remove: async (keys) => {
      if (keys.length > 0) await area.remove(keys);
    },
    keys: async () => Object.keys(await area.get(null)),
  };
}

/** An object store of its own in the extension's IndexedDB, apart from the device key's. */
export function indexedDbStore<T>(database: string, store: string): KeyValue<T> {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(database, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  async function run<R>(mode: IDBTransactionMode, action: (objects: IDBObjectStore) => IDBRequest<R> | undefined): Promise<R | undefined> {
    const db = await open();
    try {
      return await new Promise<R | undefined>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = action(transaction.objectStore(store));
        transaction.oncomplete = () => resolve(request?.result);
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }

  return {
    get: async (key) => ((await run('readonly', (objects) => objects.get(key))) as T | undefined) ?? null,
    set: async (key, value) => {
      await run('readwrite', (objects) => objects.put(value, key));
    },
    remove: async (keys) => {
      if (keys.length === 0) return;
      await run('readwrite', (objects) => {
        for (const key of keys) objects.delete(key);
        return undefined;
      });
    },
    keys: async () => ((await run('readonly', (objects) => objects.getAllKeys())) ?? []).map(String),
  };
}
