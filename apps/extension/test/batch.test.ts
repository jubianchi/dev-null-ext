import { describe, expect, it, vi } from 'vitest';
import { batched } from '../src/lib/batch.ts';

describe('batched', () => {
  it('asks once for the keys asked for together, and answers each its own', async () => {
    const fetch = vi.fn(async (keys: string[]) => Object.fromEntries(keys.map((key) => [key, key.toUpperCase()])));
    const lookup = batched(fetch);

    expect(await Promise.all([lookup('a'), lookup('b'), lookup('a')])).toEqual(['A', 'B', 'A']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(['a', 'b']);
  });

  it('asks again for the keys asked for later', async () => {
    const fetch = vi.fn(async (keys: string[]) => Object.fromEntries(keys.map((key) => [key, key])));
    const lookup = batched(fetch);

    await lookup('a');
    await lookup('b');

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('answers null for every key when the answer is null, and rejects them all when it fails', async () => {
    expect(await batched(async () => null)('a')).toBeNull();
    await expect(batched(async () => Promise.reject(new Error('offline')))('a')).rejects.toThrow('offline');
  });
});
