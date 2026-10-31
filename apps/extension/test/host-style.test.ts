// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { styleHost } from '../src/lib/host-style.ts';

describe('styleHost', () => {
  it("styles a shadow root's host above WXT's reset (:host { all: initial !important })", () => {
    const host = document.createElement('devnull-share');

    styleHost(host, { display: 'inline-flex', 'margin-right': '8px' });

    expect(host.style.getPropertyValue('margin-right')).toBe('8px');
    expect(host.style.getPropertyPriority('margin-right')).toBe('important');
    expect(host.style.getPropertyPriority('display')).toBe('important');
  });
});
