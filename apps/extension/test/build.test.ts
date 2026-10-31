import { describe, expect, it } from 'vitest';
import { buildIdentity, isDevBuild } from '../src/lib/build.ts';

describe('isDevBuild', () => {
  it('is a development build under pnpm dev, or when it talks to another server than dev-null.sh', () => {
    expect(isDevBuild('development', 'https://dev-null.sh')).toBe(true);
    expect(isDevBuild('production', 'http://localhost:8000')).toBe(true);
  });

  it('is the real thing when built for production against dev-null.sh, as releases are', () => {
    expect(isDevBuild('production', 'https://dev-null.sh')).toBe(false);
  });
});

describe('buildIdentity', () => {
  it('names and draws a development build apart, in the extensions page and in the toolbar', () => {
    expect(buildIdentity(true)).toEqual({
      name: '/dev/null (dev)',
      icons: { 16: 'icon-dev/16.png', 32: 'icon-dev/32.png', 48: 'icon-dev/48.png', 96: 'icon-dev/96.png', 128: 'icon-dev/128.png' },
    });
  });

  it('keeps the published name and icons otherwise', () => {
    expect(buildIdentity(false)).toEqual({
      name: '/dev/null',
      icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 96: 'icon/96.png', 128: 'icon/128.png' },
    });
  });
});
