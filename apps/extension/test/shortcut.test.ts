import { describe, expect, it } from 'vitest';
import { isSharePageMessage, SHARE_PAGE_COMMAND, SHARE_PAGE_MESSAGE } from '../src/lib/shortcut.ts';

describe('the share-page shortcut', () => {
  it('is the command the manifest declares', () => {
    expect(SHARE_PAGE_COMMAND).toBe('share-page');
  });

  it('tells its message to the content script from any other', () => {
    expect(isSharePageMessage(SHARE_PAGE_MESSAGE)).toBe(true);
    expect(isSharePageMessage({ type: 'session' })).toBe(false);
    expect(isSharePageMessage(null)).toBe(false);
    expect(isSharePageMessage('share-page')).toBe(false);
  });
});
