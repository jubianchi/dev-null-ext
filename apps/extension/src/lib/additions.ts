import { type SharedPage, shareLabel } from './share.ts';

/**
 * What the composers add below what the user writes: each addition is a piece of the commit's body the extension
 * proposes for a reason it can tell, and that the user can remove. Sources propose them from the context; adding an
 * idea is writing a source and listing it in SOURCES, without touching the composers.
 */

/** Where a commit is written from: a GitHub page, an organization, or both. */
export type ComposerContext = { page: SharedPage; organization: string | null } | { page: null; organization: string };

export interface Addition {
  /** Stable for a context, so the user's choice to remove it holds while they write. */
  id: string;
  kind: 'link' | 'mention';
  /** What goes into the body. */
  text: string;
  /** What the user sees. */
  label: string;
  /** Why it is added, for the user. */
  reason: string;
}

export type AdditionSource = (context: ComposerContext) => Addition[];

/** The GitHub page the commit is about, which /dev/null shows as a card. */
export const pageLink: AdditionSource = ({ page }) =>
  page
    ? [{ id: 'page-link', kind: 'link', text: page.url, label: shareLabel(page), reason: 'Links this page, which /dev/null shows as a card.' }]
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
        },
      ]
    : [];

export const SOURCES: AdditionSource[] = [pageLink, organizationMention];

export function additionsFor(context: ComposerContext, sources: AdditionSource[] = SOURCES): Addition[] {
  return sources.flatMap((source) => source(context));
}

/** The body /dev/null receives: what the user wrote, a blank line, then the additions they kept, one per line. */
export function composeBody(text: string, additions: Addition[], removed: ReadonlySet<string>): string {
  const kept = additions.filter((addition) => !removed.has(addition.id)).map((addition) => addition.text);

  return [text.trim(), kept.join('\n')].filter(Boolean).join('\n\n');
}
