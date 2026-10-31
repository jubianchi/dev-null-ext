import { describe, expect, it } from 'vitest';
import { commitLength } from '../src/lib/share.ts';

describe('commitLength', () => {
  it('counts a link as at most 23 characters, as /dev/null does', () => {
    expect(commitLength('https://github.com/laravel/framework/pull/58112')).toBe(23);
    expect(commitLength('a\n\n\n\nb')).toBe(4);
  });

  it('counts code points, as /dev/null does, not UTF-16 units', () => {
    expect(commitLength('shipped 🚀')).toBe(9);
  });

  it('normalizes line breaks before counting', () => {
    expect(commitLength('a\r\nb\rc')).toBe(5);
    expect(commitLength('a\r\n\r\n\r\nb')).toBe(4);
  });

  it('keeps links and blank lines in code as they are', () => {
    const url = 'https://github.com/laravel/framework/pull/58112';

    expect(commitLength(`\`${url}\``)).toBe(url.length + 2);
    expect(commitLength('```\na\n\n\n\nb\n```')).toBe(14);
  });
});
