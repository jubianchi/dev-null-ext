import { describe, expect, it } from 'vitest';
import { gitHubLinkTo } from '../src/lib/github/links.ts';

/** The label GitHub writes and the description a screen reader reads, as dev-null.sh renders them (ForgeLink). */
function read(url: string): [string, string] | null {
  const target = gitHubLinkTo(url);
  if (!target) return null;

  const name = target.repository === null ? target.owner : `${target.owner}/${target.repository}`;
  return [`${name}${target.item?.suffix ?? ''}`, `${name}${target.item ? ` ${target.item.description}` : ''}`];
}

const sha = '4fa008fe2c9b1d3e5f7a9b0c1d2e3f4a5b6c7d8e';

describe('gitHubLinkTo', () => {
  it.each([
    ['https://github.com/laravel/framework', 'laravel/framework', 'laravel/framework'],
    ['https://www.github.com/laravel/framework', 'laravel/framework', 'laravel/framework'],
    ['HTTPS://GitHub.com/laravel/framework', 'laravel/framework', 'laravel/framework'],
    ['http://github.com/nunomaduro/dev-null.sh', 'nunomaduro/dev-null.sh', 'nunomaduro/dev-null.sh'],
    ['https://github.com/laravel/framework/issues/42', 'laravel/framework#42', 'laravel/framework issue #42'],
    ['https://github.com/laravel/framework/pull/42', 'laravel/framework#42', 'laravel/framework pull request #42'],
    ['https://github.com/laravel/framework/Pull/42', 'laravel/framework#42', 'laravel/framework pull request #42'],
    ['https://github.com/laravel/framework/commit/4fa008f', 'laravel/framework@4fa008f', 'laravel/framework commit 4fa008f'],
    [`https://github.com/laravel/framework/commit/${sha}`, 'laravel/framework@4fa008f', 'laravel/framework commit 4fa008f'],
    ['https://github.com/laravel/framework/COMMIT/4fa008f', 'laravel/framework@4fa008f', 'laravel/framework commit 4fa008f'],
    ['https://github.com/laravel/framework/compare/v12.0.0...v12.1.0', 'laravel/framework@v12.0.0...v12.1.0', 'laravel/framework comparison v12.0.0...v12.1.0'],
    [`https://github.com/laravel/framework/compare/12.x..${sha}`, 'laravel/framework@12.x..4fa008f', 'laravel/framework comparison 12.x..4fa008f'],
    ['https://github.com/laravel/framework/releases/tag/v12.1.0', 'laravel/framework@v12.1.0', 'laravel/framework release v12.1.0'],
    [
      'https://github.com/laravel/framework/releases/tag/packages/queue-1.0',
      'laravel/framework@packages/queue-1.0',
      'laravel/framework release packages/queue-1.0',
    ],
    ['https://github.com/laravel/framework/discussions/42', 'laravel/framework#42', 'laravel/framework discussion #42'],
    ['https://github.com/laravel/framework/issues/42#issuecomment-1', 'laravel/framework#42 (comment)', 'laravel/framework comment on issue #42'],
    ['https://github.com/laravel/framework/pull/42#discussion_r123', 'laravel/framework#42 (comment)', 'laravel/framework comment on pull request #42'],
    ['https://github.com/laravel/framework/pull/42#pullrequestreview-7', 'laravel/framework#42 (review)', 'laravel/framework review on pull request #42'],
    [
      'https://github.com/laravel/framework/discussions/42#discussioncomment-9',
      'laravel/framework#42 (comment)',
      'laravel/framework comment on discussion #42',
    ],
    ['https://github.com/taylorotwell', 'taylorotwell', 'taylorotwell'],
    ['https://github.com/orgs/laravel', 'laravel', 'laravel'],
    [
      'https://github.com/dev-null-sh/dev-null.sh/blob/production/app/Services/TheAlgorithm.php',
      'dev-null-sh/dev-null.sh:TheAlgorithm.php',
      'dev-null-sh/dev-null.sh file app/Services/TheAlgorithm.php',
    ],
    ['https://github.com/laravel/framework/blob/12.x/README.md#L10', 'laravel/framework:README.md:10', 'laravel/framework file README.md, line 10'],
    [
      `https://github.com/laravel/framework/blob/${sha}/src/Illuminate/Support/Str.php#L10-L20`,
      'laravel/framework:Str.php:10-20',
      'laravel/framework file src/Illuminate/Support/Str.php, lines 10 to 20',
    ],
    ['https://github.com/laravel/framework/blob/12.x/docs/read%20me.md', 'laravel/framework:read me.md', 'laravel/framework file docs/read me.md'],
    ['https://github.com/laravel/framework/tree/12.x/src/Illuminate', 'laravel/framework:Illuminate/', 'laravel/framework folder src/Illuminate'],
  ])('reads %s as GitHub writes it', (url, label, description) => {
    expect(read(url)).toEqual([label, description]);
  });

  it.each([
    'https://github.com/laravel/',
    'https://github.com/laravel?tab=repositories',
    'https://github.com/laravel#top',
    'https://github.com/-laravel',
    'https://github.com/orgs',
    'https://github.com/orgs/laravel/people',
    'https://github.com/orgs/-laravel',
    'https://github.com/laravel/framework/',
    'https://github.com/laravel/framework/blob/12.x',
    'https://github.com/laravel/framework/blob/12.x/README.md/',
    'https://github.com/laravel/framework/blob/12.x/README.md#readme',
    'https://github.com/laravel/framework/blob/12.x/README.md#L0',
    'https://github.com/laravel/framework/tree/12.x',
    'https://github.com/laravel/framework/tree/12.x/src#L10',
    'https://github.com/laravel/framework/releases',
    'https://github.com/laravel/framework/releases/tag',
    'https://github.com/laravel/framework/releases/tag/v12.1.0/',
    'https://github.com/laravel/framework/releases/latest',
    'https://github.com/laravel/framework/commit/4fa00',
    'https://github.com/laravel/framework/commit/4fa008g',
    'https://github.com/laravel/framework/commit/4fa008f/',
    `https://github.com/laravel/framework/commit/${sha}0`,
    'https://github.com/laravel/framework/commit/4fa008f#diff-1',
    'https://github.com/laravel/framework/compare/12.x',
    'https://github.com/laravel/framework/compare/a...b...c',
    'https://github.com/laravel/framework/compare/...b',
    'https://user:secret@github.com/laravel/framework',
    'https://user@github.com/laravel/framework/issues/42',
    'https://github.com:8443/laravel/framework',
    'https://github.com/laravel/framework/pull/42/files',
    'https://github.com/laravel/framework/pull/42/',
    'https://github.com/laravel/framework/issues/0',
    'https://github.com/laravel/framework/issues/042',
    'https://github.com/laravel/framework/issues',
    'https://github.com/laravel/framework/issues/42#top',
    'https://github.com/laravel/framework/issues/42#issuecomment-',
    'https://github.com/laravel/framework/issues/42?page=2',
    'https://github.com/laravel/framework/discussions/0',
    'https://github.com/laravel/framework/discussions',
    'https://github.com/laravel/framework/constructor/42',
    'https://github.com/laravel/framework/constructor/42#x',
    'https://github.com/laravel/framework/__proto__/42#x',
    'https://github.com/laravel/framework/toString/42',
    'https://github.com/laravel/framework?tab=readme',
    'https://github.com/laravel/framework#readme',
    'https://github.com/features/actions',
    'https://github.com/features',
    'https://github.com/dashboard',
    'https://github.com/copilot',
    'https://github.com/readme',
    'https://github.com/signup',
    'https://github.com/blog',
    'https://github.com/education',
    'https://github.com/enterprises',
    'https://github.com/mobile',
    'https://github.com/settings/profile',
    'https://gist.github.com/laravel/framework',
    'https://notgithub.com/laravel/framework',
  ])('keeps %s as a URL', (url) => {
    expect(gitHubLinkTo(url)).toBeNull();
  });
});
