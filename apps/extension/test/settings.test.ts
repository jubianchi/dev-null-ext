import { describe, expect, it } from 'vitest';
import { decorationsFor, disabledFeatures, FEATURES, readSettings } from '../src/lib/settings.ts';

const all = readSettings(undefined);

describe('readSettings', () => {
  it('turns every feature on by default', () => {
    expect(Object.values(all).every(Boolean)).toBe(true);
    expect(Object.keys(all).sort()).toEqual(FEATURES.map((feature) => feature.id).sort());
  });

  it('keeps what the user turned off, and nothing it does not know', () => {
    const settings = readSettings({ 'issue-button': false, 'pull-button': 'no', unknown: false });

    expect(settings['issue-button']).toBe(false);
    expect(settings['pull-button']).toBe(true);
    expect('unknown' in settings).toBe(false);
  });
});

describe('FEATURES', () => {
  it('names and explains every feature, in groups, for the settings screen', () => {
    for (const feature of FEATURES) {
      expect(feature.group).not.toBe('');
      expect(feature.label).not.toBe('');
      expect(feature.hint).not.toBe('');
    }
  });

  it('files the "On /dev/null" section with discussions, named as GitHub shows it', () => {
    expect(FEATURES.find(({ id }) => id === 'discussions-sidebar')).toMatchObject({ group: 'Discussions', label: 'On /dev/null section' });
  });

  it('says where a button goes as "next to", never "by"', () => {
    for (const feature of FEATURES) expect(feature.hint).not.toMatch(/\bby\b/i);
    expect(FEATURES.find((feature) => feature.id === 'issue-button')?.hint).toBe('Next to New issue');
  });
});

describe('decorationsFor', () => {
  const issue = { kind: 'issue' as const, owner: 'a', repository: 'b', number: 1, title: null, url: '' };

  it('mounts on each page what its features allow', () => {
    expect(decorationsFor({ kind: 'organization', organization: 'a' }, all)).toEqual(['organization-tab', 'organization-follow']);
    expect(decorationsFor({ kind: 'organization', organization: 'a', discussions: true }, all)).toEqual([
      'organization-tab',
      'organization-follow',
      'discussions-sidebar',
    ]);
    expect(decorationsFor({ kind: 'organization', organization: 'a', people: true }, all)).toEqual([
      'organization-tab',
      'organization-follow',
      'follow-buttons',
    ]);
    expect(decorationsFor({ kind: 'profile', login: 'a' }, all)).toEqual(['profile-follow']);
    expect(decorationsFor({ kind: 'profile', login: 'a', people: true }, all)).toEqual(['profile-follow', 'follow-buttons']);
    expect(decorationsFor({ kind: 'repository', owner: 'a', repository: 'b', url: '', people: true }, all)).toEqual(['share-button', 'follow-buttons']);
    expect(decorationsFor(issue, all)).toEqual(['share-button']);
    expect(decorationsFor({ kind: 'releases', owner: 'a', repository: 'b' }, all)).toEqual(['release-buttons']);
    expect(decorationsFor({ kind: 'other' }, all)).toEqual([]);
  });

  it('mounts nothing the user turned off', () => {
    const settings = readSettings({
      'organization-tab': false,
      'issue-button': false,
      'pull-button': true,
      'release-buttons': false,
      'repository-button': false,
      'discussion-button': false,
      'follow-buttons': false,
      'profile-follow': false,
      'organization-follow': false,
    });

    expect(decorationsFor({ kind: 'organization', organization: 'a', discussions: true }, settings)).toEqual(['discussions-sidebar']);
    expect(decorationsFor({ kind: 'organization', organization: 'a', people: true }, settings)).toEqual([]);
    expect(decorationsFor({ kind: 'profile', login: 'a' }, settings)).toEqual([]);
    expect(decorationsFor({ kind: 'profile', login: 'a', people: true }, settings)).toEqual([]);
    expect(decorationsFor({ kind: 'repository', owner: 'a', repository: 'b', url: '', people: true }, settings)).toEqual([]);
    expect(decorationsFor(issue, settings)).toEqual([]);
    expect(decorationsFor({ ...issue, kind: 'pull-request' }, settings)).toEqual(['share-button']);
    expect(decorationsFor({ ...issue, kind: 'discussion' }, settings)).toEqual([]);
    expect(decorationsFor({ kind: 'repository', owner: 'a', repository: 'b', url: '' }, settings)).toEqual([]);
    expect(decorationsFor({ kind: 'releases', owner: 'a', repository: 'b' }, settings)).toEqual([]);
  });
});

describe('disabledFeatures', () => {
  it('lists the features the user turned off, for the composers to leave out their additions', () => {
    expect([...disabledFeatures(readSettings({ 'author-mention': false }))]).toEqual(['author-mention']);
  });
});
