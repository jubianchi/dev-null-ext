import { describe, expect, it } from 'vitest';
import { commitLength, shareBody } from '../src/lib/share.ts';

const pull = {
  kind: 'pull-request' as const,
  owner: 'laravel',
  repository: 'framework',
  number: 58112,
  title: 'Fix the queue',
  url: 'https://github.com/laravel/framework/pull/58112',
};

describe('shareBody', () => {
  it('puts the link and a bare @mention of the organization under what the user wrote', () => {
    expect(shareBody('  Great fix  ', pull, 'laravel')).toBe('Great fix\n\nhttps://github.com/laravel/framework/pull/58112\n@laravel');
  });

  it('mentions nobody for a repository a user owns', () => {
    expect(shareBody('Nice', { ...pull, owner: 'jubianchi' }, null)).toBe('Nice\n\nhttps://github.com/laravel/framework/pull/58112');
  });
});

describe('commitLength', () => {
  it('counts a link as at most 23 characters, as /dev/null does', () => {
    expect(commitLength('https://github.com/laravel/framework/pull/58112')).toBe(23);
    expect(commitLength('a\n\n\n\nb')).toBe(4);
  });
});
