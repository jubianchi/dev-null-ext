import { describe, expect, it } from 'vitest';
import { type Addition, additionsFor, composeBody, organizationMention, pageLink } from '../src/lib/additions.ts';

const pull = {
  kind: 'pull-request' as const,
  owner: 'laravel',
  repository: 'framework',
  number: 58112,
  title: 'Fix the queue',
  url: 'https://github.com/laravel/framework/pull/58112',
};

describe('addition sources', () => {
  it('links the GitHub page the commit is about', () => {
    expect(pageLink({ page: pull, organization: null })).toEqual([
      expect.objectContaining({ id: 'page-link', kind: 'link', text: pull.url, label: 'laravel/framework#58112' }),
    ]);
    expect(pageLink({ page: null, organization: 'laravel' })).toEqual([]);
  });

  it('mentions the organization, which files the commit under its /dev/null page', () => {
    expect(organizationMention({ page: pull, organization: 'laravel' })).toEqual([
      expect.objectContaining({ id: 'organization-mention', kind: 'mention', text: '@laravel', label: '@laravel' }),
    ]);
    expect(organizationMention({ page: pull, organization: null })).toEqual([]);
  });

  it('gives every addition a reason to show the user', () => {
    for (const addition of additionsFor({ page: pull, organization: 'laravel' })) {
      expect(addition.reason).not.toBe('');
    }
  });

  it('asks every source, in order', () => {
    expect(additionsFor({ page: pull, organization: 'laravel' }).map((addition) => addition.id)).toEqual(['page-link', 'organization-mention']);
  });
});

describe('composeBody', () => {
  const additions: Addition[] = additionsFor({ page: pull, organization: 'laravel' });

  it('puts the additions below what the user wrote, one per line', () => {
    expect(composeBody('  Merged! ', additions, new Set())).toBe(`Merged!\n\n${pull.url}\n@laravel`);
  });

  it('leaves out the additions the user removed', () => {
    expect(composeBody('Merged!', additions, new Set(['organization-mention']))).toBe(`Merged!\n\n${pull.url}`);
    expect(composeBody('Merged!', additions, new Set(['page-link', 'organization-mention']))).toBe('Merged!');
  });

  it('is only the additions when the user wrote nothing', () => {
    expect(composeBody('', additions, new Set())).toBe(`${pull.url}\n@laravel`);
  });
});
