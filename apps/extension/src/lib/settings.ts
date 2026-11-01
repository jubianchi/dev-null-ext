import type { GitHubPage } from './github/page.ts';

/**
 * What the extension adds to GitHub, each a feature the user can turn off from the popup's settings. Every feature is
 * on by default; the settings only keep what the user turned off.
 */
export const FEATURES = [
  { id: 'organization-tab', group: 'Organizations', label: 'The /dev/null tab', hint: 'Commits mentioning the organization, next to its other tabs' },
  { id: 'repository-button', group: 'Repositories', label: 'Commit button', hint: 'Next to Watch, Fork and Star' },
  { id: 'release-buttons', group: 'Repositories', label: 'Commit button on releases', hint: "Next to each release's Compare button" },
  { id: 'issue-button', group: 'Issues and pull requests', label: 'Commit button on issues', hint: 'Next to New issue' },
  { id: 'pull-button', group: 'Issues and pull requests', label: 'Commit button on pull requests', hint: 'Next to Code' },
  { id: 'discussion-button', group: 'Discussions', label: 'Commit button', hint: "Next to the discussion's title" },
  {
    id: 'discussions-sidebar',
    group: 'Discussions',
    label: 'On /dev/null section',
    hint: "The latest commits mentioning the organization, next to its discussions' guidelines",
  },
  { id: 'follow-buttons', group: 'People', label: 'Follow buttons', hint: "Next to GitHub's own Follow, on an organization's people" },
  { id: 'author-mention', group: 'Composer', label: 'Offer to mention the author', hint: 'Of the issue or pull request you share' },
  { id: 'organization-mention', group: 'Composer', label: 'Offer to mention the organization', hint: 'So the commit shows in its log' },
] as const;

export type FeatureId = (typeof FEATURES)[number]['id'];
export type Settings = Record<FeatureId, boolean>;

/** The settings as stored, every feature on unless the user turned it off; anything else in storage is ignored. */
export function readSettings(stored: unknown): Settings {
  const values = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};

  return Object.fromEntries(FEATURES.map(({ id }) => [id, values[id] !== false])) as Settings;
}

export function disabledFeatures(settings: Settings): ReadonlySet<FeatureId> {
  return new Set(FEATURES.map(({ id }) => id).filter((id) => !settings[id]));
}

/** What the content script mounts on a page. */
export type Decoration = 'organization-tab' | 'discussions-sidebar' | 'follow-buttons' | 'share-button' | 'release-buttons';

const SHARE_BUTTONS: Partial<Record<GitHubPage['kind'], FeatureId>> = {
  repository: 'repository-button',
  issue: 'issue-button',
  'pull-request': 'pull-button',
  discussion: 'discussion-button',
};

/** What to mount on a page, as the settings allow. */
export function decorationsFor(page: GitHubPage, settings: Settings): Decoration[] {
  if (page.kind === 'organization') {
    return [
      ...(settings['organization-tab'] ? (['organization-tab'] as const) : []),
      ...(page.discussions && settings['discussions-sidebar'] ? (['discussions-sidebar'] as const) : []),
      ...(page.people && settings['follow-buttons'] ? (['follow-buttons'] as const) : []),
    ];
  }
  if (page.kind === 'releases') return settings['release-buttons'] ? ['release-buttons'] : [];

  const feature = SHARE_BUTTONS[page.kind];
  return feature && settings[feature] ? ['share-button'] : [];
}
