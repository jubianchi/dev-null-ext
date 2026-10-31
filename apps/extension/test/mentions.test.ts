import { describe, expect, it } from 'vitest';
import type { Addition } from '../src/lib/additions.ts';
import { additionCandidates, type MentionCandidate, matching, mentionAt, withMention } from '../src/lib/mentions.ts';

describe('mentionAt', () => {
  it('finds the mention being typed before the caret', () => {
    expect(mentionAt('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionAt('Thanks @lara', 12)).toEqual({ start: 7, query: 'lara' });
    expect(mentionAt('Thanks (@taylor-otwell', 22)).toEqual({ start: 8, query: 'taylor-otwell' });
    expect(mentionAt('line\n@x', 7)).toEqual({ start: 5, query: 'x' });
  });

  it('only looks at what is before the caret', () => {
    expect(mentionAt('Thanks @laravel for it', 11)).toEqual({ start: 7, query: 'lar' });
  });

  it('is not a mention in an address, a word or once a space is typed', () => {
    expect(mentionAt('me@example', 10)).toBeNull();
    expect(mentionAt('Thanks @laravel ', 16)).toBeNull();
    expect(mentionAt('Thanks', 6)).toBeNull();
    expect(mentionAt('@laravel/framework', 18)).toBeNull();
  });
});

const candidate = (handle: string, name: string | null = null): MentionCandidate => ({ handle, name, avatarUrl: null, reason: null });

describe('matching', () => {
  const candidates = [candidate('laravel'), candidate('taylorotwell', 'Taylor Otwell'), candidate('nunomaduro', 'Nuno Maduro')];

  it('offers every candidate, in order, for a bare @', () => {
    expect(matching(candidates, '').map(({ handle }) => handle)).toEqual(['laravel', 'taylorotwell', 'nunomaduro']);
  });

  it("keeps those whose handle or name contains what's typed, ignoring case, as /dev/null does", () => {
    expect(matching(candidates, 'TAY').map(({ handle }) => handle)).toEqual(['taylorotwell']);
    expect(matching(candidates, 'otw').map(({ handle }) => handle)).toEqual(['taylorotwell']);
    expect(matching(candidates, 'no ma').map(({ handle }) => handle)).toEqual(['nunomaduro']);
    expect(matching(candidates, 'x')).toEqual([]);
  });

  it('lists a handle once, where it first comes', () => {
    expect(matching([candidate('laravel'), candidate('Laravel', 'Laravel')], '').map(({ handle }) => handle)).toEqual(['laravel']);
  });
});

describe('withMention', () => {
  it('replaces what is typed with the mention and a space, the caret after it', () => {
    expect(withMention('Thanks @lar for it', { start: 7, query: 'lar' }, 'laravel')).toEqual({ value: 'Thanks @laravel for it', caret: 16 });
    expect(withMention('Thanks @lar', { start: 7, query: 'lar' }, 'laravel')).toEqual({ value: 'Thanks @laravel ', caret: 16 });
  });
});

describe('additionCandidates', () => {
  const mention = (id: string, handle: string, reason: string): Addition => ({
    id,
    kind: 'mention',
    text: `@${handle}`,
    label: `@${handle}`,
    reason,
    pattern: /x/,
  });

  it("offers the composer's mentions, the organization first, then the author", () => {
    const additions: Addition[] = [
      { id: 'page-link', kind: 'link', text: 'https://github.com/a/b', label: 'a/b', reason: 'Links', pattern: /x/ },
      mention('author-mention', 'taylorotwell', 'Who opened this issue'),
      mention('organization-mention', 'laravel', 'The organization'),
    ];

    expect(additionCandidates(additions)).toEqual([
      { handle: 'laravel', name: null, avatarUrl: 'https://github.com/laravel.png?size=40', reason: 'The organization' },
      { handle: 'taylorotwell', name: null, avatarUrl: 'https://github.com/taylorotwell.png?size=40', reason: 'Who opened this issue' },
    ]);
  });
});
