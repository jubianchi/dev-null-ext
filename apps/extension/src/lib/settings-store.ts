import { storage } from 'wxt/utils/storage';
import { type FeatureId, readSettings, type Settings } from './settings.ts';

/** The settings in the browser's synced storage, so they follow the user from one browser to another. */
const item = storage.defineItem<Record<string, boolean>>('sync:settings', { fallback: {} });

export async function loadSettings(): Promise<Settings> {
  return readSettings(await item.getValue());
}

export async function saveSetting(id: FeatureId, on: boolean): Promise<void> {
  await item.setValue({ ...(await item.getValue()), [id]: on });
}

/** Calls back with the new settings whenever they change, from the popup or another browser; returns how to stop. */
export function watchSettings(callback: (settings: Settings) => void): () => void {
  return item.watch((value) => callback(readSettings(value)));
}
