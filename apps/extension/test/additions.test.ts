import { describe, expect, it } from 'vitest';
import { additionsFor, isIn, organizationMention, pageLink, withAddition } from '../src/lib/additions.ts';

const pull = {
  kind: 'pull-request' as const,
  owner: 'laravel',
  repository: 'framework',
  number: 58112,
  title: 'Fix the queue',
  url: 'https://github.com/laravel/framework/pull/58112',
};

const [link, mention] = additionsFor({ page: pull, organization: 'laravel' });

describe('addition sources', () => {
  it('links the GitHub page the commit is about', () => {
    expect(pageLink({ page: pull, organization: null })).toEqual([
      expect.objectContaining({ id: 'page-link', kind: 'link', text: pull.url, label: 'laravel/framework#58112' }),
    ]);
    expect(pageLink({ page: null, organization: 'laravel' })).toEqual([]);
  });

  it('links a discussion as owner/repo#number', () => {
    const discussion = { ...pull, kind: 'discussion' as const, repository: 'discussions', url: 'https://github.com/laravel/discussions/discussions/58112' };

    expect(pageLink({ page: discussion, organization: 'laravel' })[0]?.label).toBe('laravel/discussions#58112');
  });

  it('mentions the organization, which files the commit under its /dev/null page', () => {
    expect(organizationMention({ page: pull, organization: 'laravel' })).toEqual([
      expect.objectContaining({ id: 'organization-mention', kind: 'mention', text: '@laravel', label: '@laravel' }),
    ]);
    expect(organizationMention({ page: pull, organization: null })).toEqual([]);
  });

  it('gives every addition a reason to show the user', () => {
    for (const addition of additionsFor({ page: pull, organization: 'laravel' })) expect(addition.reason).not.toBe('');
  });

  it("warns when the organization's log is written to without mentioning it, where the commit wouldn't show", () => {
    expect(organizationMention({ page: null, organization: 'laravel' })[0]?.missing).toBe("Not mentioning @laravel: this commit won't show here.");
    expect(organizationMention({ page: pull, organization: 'laravel' })[0]?.missing).toBeUndefined();
  });
});

describe('isIn', () => {
  it('finds a mention wherever the user put or typed it, whatever its case', () => {
    expect(isIn(mention!, 'Thanks @laravel!')).toBe(true);
    expect(isIn(mention!, 'thanks @Laravel')).toBe(true);
    expect(isIn(mention!, '@laravel/framework is great')).toBe(false);
    expect(isIn(mention!, '@laravel-news')).toBe(false);
    expect(isIn(mention!, 'me@laravel.com')).toBe(false);
  });

  it('finds the exact link, followed by nothing but punctuation or space', () => {
    expect(isIn(link!, `see ${pull.url}.`)).toBe(true);
    expect(isIn(link!, `(${pull.url})`)).toBe(true);
    expect(isIn(link!, `${pull.url}/files`)).toBe(false);
    expect(isIn(link!, `${pull.url}0`)).toBe(false);
  });
});

describe('withAddition', () => {
  it('inserts the addition at the caret, spaced from the words around it', () => {
    expect(withAddition('Thanks for it', mention!, 6)).toEqual({ value: 'Thanks @laravel for it', caret: 15 });
    expect(withAddition('Thanks ', mention!, 7)).toEqual({ value: 'Thanks @laravel', caret: 15 });
    expect(withAddition('', mention!, 0)).toEqual({ value: '@laravel', caret: 8 });
  });
});
