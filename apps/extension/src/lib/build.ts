import { isDefaultServer } from './server.ts';

const SIZES = [16, 32, 48, 96, 128] as const;

/**
 * A development build: run by pnpm dev, or talking to another server than dev-null.sh. It has to be told apart from the
 * published extension, which may be installed next to it.
 */
export function isDevBuild(mode: string, server: string): boolean {
  return mode === 'development' || !isDefaultServer(server);
}

/** How a build shows in the browser: its name on the extensions page, its icon there and in the toolbar. */
export function buildIdentity(dev: boolean): { name: string; icons: Record<number, string> } {
  const folder = dev ? 'icon-dev' : 'icon';

  return {
    name: dev ? '/dev/null (dev)' : '/dev/null',
    icons: Object.fromEntries(SIZES.map((size) => [size, `${folder}/${size}.png`])),
  };
}
