import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounced, isEmptyStash, stashName } from '../src/lib/stash.ts';

describe('stashName', () => {
  it('names a reply and a quote after the commit they answer, as dev-null.sh does', () => {
    expect(stashName({ parentId: '01J0PARENT' })).toBe('reply-01J0PARENT');
    expect(stashName({ quotedCommitId: '01J0QUOTED' })).toBe('quote-01J0QUOTED');
  });

  it('names a commit about a page after its URL, and one from a log after its organization', () => {
    const page = {
      kind: 'issue',
      owner: 'dev-null-sh',
      repository: 'dev-null.sh',
      number: 1335,
      title: null,
      url: 'https://github.com/dev-null-sh/dev-null.sh/issues/1335',
    } as const;

    expect(stashName({ page, organization: 'dev-null-sh' })).toBe('page:https://github.com/dev-null-sh/dev-null.sh/issues/1335');
    expect(stashName({ page: null, organization: 'dev-null-sh' })).toBe('organization:dev-null-sh');
    expect(stashName({ web: { url: 'https://cbea.ms/git-commit/', title: 'Git commit' } })).toBe('page:https://cbea.ms/git-commit/');
  });
});

describe('isEmptyStash', () => {
  it('is empty without text, blank lines included, and without images', () => {
    expect(isEmptyStash({ text: ' \n ', images: [] })).toBe(true);
    expect(isEmptyStash({ text: 'Hello', images: [] })).toBe(false);
    expect(isEmptyStash({ text: '', images: [{ id: 'a', type: 'image/png', name: 'a.png', description: '' }] })).toBe(false);
  });
});

describe('debounced', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls once, with the last arguments, after the delay', () => {
    const call = vi.fn();
    const save = debounced(call, 300);

    save('a');
    vi.advanceTimersByTime(200);
    save('b');
    vi.advanceTimersByTime(299);
    expect(call).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(call).toHaveBeenCalledOnce();
    expect(call).toHaveBeenCalledWith('b');
  });

  it('calls at once on flush, and only when a call is pending', () => {
    const call = vi.fn();
    const save = debounced(call, 300);

    save.flush();
    expect(call).not.toHaveBeenCalled();

    save('a');
    save.flush();
    expect(call).toHaveBeenCalledWith('a');

    vi.advanceTimersByTime(300);
    expect(call).toHaveBeenCalledOnce();
  });

  it('forgets a pending call on cancel', () => {
    const call = vi.fn();
    const save = debounced(call, 300);

    save('a');
    save.cancel();
    vi.advanceTimersByTime(300);
    save.flush();
    expect(call).not.toHaveBeenCalled();
  });
});
