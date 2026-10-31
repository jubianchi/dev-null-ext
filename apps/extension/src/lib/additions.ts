import { type SharedPage, shareLabel } from './share.ts';

/**
 * What the composers add to a commit the user did not write: each addition is a piece of text the extension proposes
 * for a reason it can tell. They are prefilled into the text, where the user sees, moves, edits or removes them: the
 * text is the only truth, and an addition is "in" the commit when its pattern is found there, however it got there.
 * Sources propose them from the context; adding an idea is writing a source and listing it in SOURCES, without
 * touching the composers.
 */

/** Where a commit is written from: a GitHub page, an organization, or both. */
export type ComposerContext = { page: SharedPage; organization: string | null } | { page: null; organization: string };

export interface Addition {
  id: string;
  kind: 'link' | 'mention';
  /** What is inserted. */
  text: string;
  /** What the user sees. */
  label: string;
  /** Why it is added, for the user. */
  reason: string;
  /** How to find it in the text, typed by hand as well. */
  pattern: RegExp;
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

/**
 * The organization, as a bare @mention: it files the commit under the organization's /dev/null page. `@org/repo` is
 * not a mention there, on purpose.
 */
export const organizationMention: AdditionSource = ({ organization }) =>
  organization
    ? [
        {
          id: 'organization-mention',
          kind: 'mention',
          text: `@${organization}`,
          label: `@${organization}`,
          reason: `Mentions @${organization}, so the commit shows on the organization's /dev/null page.`,
          pattern: new RegExp(`(?<![\\w@./])@${escape(organization)}(?![\\w/-])`, 'i'),
        },
      ]
    : [];

export const SOURCES: AdditionSource[] = [pageLink, organizationMention];

export function additionsFor(context: ComposerContext, sources: AdditionSource[] = SOURCES): Addition[] {
  return sources.flatMap((source) => source(context));
}

/**
 * The text with the additions still pending below what the user wrote, one per line after a blank line; the additions
 * alone while they wrote nothing. A composer opens empty, its placeholder showing, the additions pending: they go
 * into the text with the user's first keystroke.
 */
export function withPending(text: string, pending: Addition[]): string {
  const additions = pending.map((addition) => addition.text).join('\n');

  return [text, additions].filter(Boolean).join('\n\n');
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

/**
 * The text without the addition, wherever it is: a line it stands alone on goes, and in a sentence one space is kept
 * between the words around it. The rest of the text is left as it is.
 */
export function withoutAddition(text: string, addition: Addition): string {
  const alone = new RegExp(`^[ \\t]*${addition.pattern.source}[ \\t]*$`, addition.pattern.flags);
  const inline = new RegExp(`( ?)${addition.pattern.source}( ?)`, `${addition.pattern.flags}g`);

  return text
    .split('\n')
    .filter((line) => !alone.test(line))
    .map((line) => line.replace(inline, (_match, lead: string, trail: string) => (lead && trail ? ' ' : '')))
    .join('\n')
    .replace(/\s+$/, '');
}
