import type { MentionSuggestions } from '@dev-null-ext/client';
import type { Addition } from './additions.ts';

/** Someone the composer can suggest to mention, as dev-null.sh's composer lists them. */
export interface MentionCandidate {
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  /** Their lane, as the API gives it: one of the six, a custom colour, or none. */
  lane: number | string | null;
  /** Why it is suggested, when the composer knows: an addition's reason. */
  reason: string | null;
}

/** The mention being typed: where its `@` is, and what follows it up to the caret. */
export interface MentionQuery {
  start: number;
  query: string;
}

/** The mention the caret is in, typed after a space, an opening parenthesis or at the start; not an address. */
export function mentionAt(text: string, caret: number): MentionQuery | null {
  const match = /(^|[\s(])@([\w-]*)$/.exec(text.slice(0, caret));
  if (!match) return null;

  const query = match[2] ?? '';
  return { start: caret - query.length - 1, query };
}

/** The candidates whose handle or name contains the query, ignoring case, as /dev/null matches; each handle once. */
export function matching(candidates: MentionCandidate[], query: string): MentionCandidate[] {
  const needle = query.toLowerCase();
  const seen = new Set<string>();

  return candidates.filter(({ handle, name }) => {
    const key = handle.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return key.includes(needle) || (name?.toLowerCase().includes(needle) ?? false);
  });
}

/** The text with the mention being typed completed, followed by a space, and the caret after that space. */
export function withMention(text: string, mention: MentionQuery, handle: string): { value: string; caret: number } {
  const before = text.slice(0, mention.start);
  const after = text.slice(mention.start + 1 + mention.query.length);
  const completed = `${before}@${handle}`;

  return { value: `${completed}${/^\s/.test(after) ? '' : ' '}${after}`, caret: completed.length + 1 };
}

const MENTION_ORDER = ['organization-mention', 'author-mention'];

/** The composer's mentions as suggestions: the organization first, then the author, with GitHub's avatars. */
export function additionCandidates(additions: Addition[]): MentionCandidate[] {
  return additions
    .filter((addition) => addition.kind === 'mention')
    .sort((a, b) => MENTION_ORDER.indexOf(a.id) - MENTION_ORDER.indexOf(b.id))
    .map((addition) => {
      const handle = addition.text.replace(/^@/, '');
      return { handle, name: null, avatarUrl: `https://github.com/${handle}.png?size=40`, lane: null, reason: addition.reason };
    });
}

/** /dev/null's suggestions, in its order: users, then organizations. */
export function suggestedCandidates({ users, organizations }: MentionSuggestions): MentionCandidate[] {
  return [...users, ...organizations].map(({ handle, name, avatar_url, lane }) => ({
    handle,
    name,
    avatarUrl: avatar_url,
    lane: lane ?? null,
    reason: null,
  }));
}
