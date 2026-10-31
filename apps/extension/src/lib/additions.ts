import { type SharedPage, shareLabel } from './share.ts';

/**
 * What the extension can add to a commit the user did not write: each addition is a piece of text it proposes for a
 * reason it can tell. Nothing is added by default: like an image, the user inserts an addition at the caret, from the
 * composer's toolbar, and the text stays the only truth. An addition is "in" the commit when its pattern is found in
 * the text, however it got there. Sources propose them from the context; adding an idea is writing a source and
 * listing it in SOURCES, without touching the composers.
 */

/** Where a commit is written from: a GitHub page, an organization, or both; and who writes it, once known. */
export type ComposerContext = ({ page: SharedPage; organization: string | null } | { page: null; organization: string }) & {
  viewer?: string | null;
  /** The additions the user turned off in the extension's settings, by id. */
  disabled?: ReadonlySet<string>;
};

export interface Addition {
  id: string;
  kind: 'link' | 'mention';
  /** What is inserted. */
  text: string;
  /** What the user sees. */
  label: string;
  /** Why it is proposed, for the user. */
  reason: string;
  /** How to find it in the text, typed by hand as well. */
  pattern: RegExp;
  /** What to tell the user when they are about to commit without it, if leaving it out has a consequence. */
  missing?: string;
}

export type AdditionSource = (context: ComposerContext) => Addition[];

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** The GitHub page the commit is about, which /dev/null shows as a card. */
export const pageLink: AdditionSource = ({ page }) =>
  page
    ? [
        {
          id: 'page-link',
          kind: 'link',
          text: page.url,
          label: shareLabel(page),
          reason: 'Links this page, which /dev/null shows as a card.',
          pattern: new RegExp(`(?<![^\\s(\\[<])${escape(page.url)}(?=$|[\\s.,;:!?)\\]>])`),
        },
      ]
    : [];

function mentionPattern(handle: string): RegExp {
  return new RegExp(`(?<![\\w@./])@${escape(handle)}(?![\\w/-])`, 'i');
}

/**
 * Who opened the issue or the pull request: their GitHub login, which is their /dev/null handle when they are there.
 * Not a bot, nor the viewer themselves.
 */
export const authorMention: AdditionSource = ({ page, viewer }) => {
  if (!page || !('author' in page) || !page.author || page.author.endsWith('[bot]')) return [];
  if (viewer && viewer.toLowerCase() === page.author.toLowerCase()) return [];

  const opened = page.kind === 'pull-request' ? 'pull request' : page.kind;
  return [
    {
      id: 'author-mention',
      kind: 'mention',
      text: `@${page.author}`,
      label: `@${page.author}`,
      reason: `Mentions @${page.author}, who opened this ${opened}, if they are on /dev/null.`,
      pattern: mentionPattern(page.author),
    },
  ];
};

/**
 * The organization, as a bare @mention: it files the commit under the organization's /dev/null page. `@org/repo` is
 * not a mention there, on purpose. Written from the organization's log, leaving it out means the commit won't show in
 * that log.
 */
export const organizationMention: AdditionSource = ({ page, organization }) =>
  organization
    ? [
        {
          id: 'organization-mention',
          kind: 'mention',
          text: `@${organization}`,
          label: `@${organization}`,
          reason: `Mentions @${organization}, so the commit shows on the organization's /dev/null page.`,
          pattern: mentionPattern(organization),
          ...(page === null ? { missing: `Not mentioning @${organization}: this commit won't show here.` } : {}),
        },
      ]
    : [];

export const SOURCES: AdditionSource[] = [pageLink, authorMention, organizationMention];

export function additionsFor(context: ComposerContext, sources: AdditionSource[] = SOURCES): Addition[] {
  return sources.flatMap((source) => source(context)).filter((addition) => !context.disabled?.has(addition.id));
}

export function isIn(addition: Addition, text: string): boolean {
  return addition.pattern.test(text);
}

/** The text with the addition inserted at the caret, spaced from the words around it, and where the caret goes next. */
export function withAddition(text: string, addition: Addition, at: number): { value: string; caret: number } {
  const before = text.slice(0, at);
  const after = text.slice(at);
  const lead = before === '' || /\s$/.test(before) ? '' : ' ';
  const trail = after === '' || /^\s/.test(after) ? '' : ' ';

  return { value: `${before}${lead}${addition.text}${trail}${after}`, caret: at + lead.length + addition.text.length + trail.length };
}
