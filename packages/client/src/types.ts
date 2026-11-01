/** Shapes of the /api/v1 resources the extension uses (App\Http\Resources\*). Only the fields it reads. */

export interface User {
  id: string;
  handle: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_url: string;
  html_url: string;
  /** When the API counts them: always on /me and users/{handle}. */
  commits_count?: number;
  following_count?: number;
  followers_count?: number;
  /** Signed requests only: an index into the six lanes, or a custom colour. */
  lane?: number | string;
}

export interface CurrentUser extends User {
  terms_accepted: boolean;
}

export interface Organization {
  handle: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_url: string;
  html_url: string;
  /** Signed requests only: a custom colour, or null for /dev/null's blue. */
  lane?: string | null;
}

/** Who /dev/null suggests to mention (GET /api/v1/search/mentions): at most 6 users and 3 organizations. */
export interface MentionSuggestions {
  users: User[];
  organizations: Organization[];
}

export type CommitStatus = 'pending' | 'approved' | 'rejected';

export interface Commit {
  id: string;
  short_hash: string;
  body: string;
  parent_id: string | null;
  html_url: string;
  created_at: string;
  stars_count?: number;
  replies_count?: number;
  author: User;
  /** Only on signed requests. */
  status?: CommitStatus;
  /** Only on signed requests, always null: a deleted commit comes as a DeletedCommit. */
  deleted_at?: null;
  starred?: boolean;
  /** Only on signed requests: the body as /dev/null renders it, whole and folded (null when it fits). */
  body_segments?: BodySegment[];
  preview_segments?: BodySegment[] | null;
  mentions?: BodyMention[];
  images?: CommitImage[];
  link_preview?: LinkPreview | null;
  /** Only on signed requests. The quoted commit is null when the viewer may not see it. */
  quoted_commit_id?: string | null;
  quoted_commit?: Commit | DeletedCommit | null;
  /** Only on signed lists: the newest reply (or quote), and the cursor to page on, newest first, through the rest. */
  reply_preview?: { data: Array<Commit | DeletedCommit>; next_cursor: string | null };
  /** Only on signed lists, for a reply: its parent, or null when the viewer may not see it. */
  parent?: Commit | DeletedCommit | null;
  /** Only on signed requests that load it: null when the commit has no poll. */
  poll?: Poll | null;
}

/**
 * A commit's poll. Its results (`total_votes`, each option's `votes_count` and `percentage`) are null until the viewer
 * votes, unless the poll is theirs or closed. Votes are final.
 */
export interface Poll {
  id: string;
  /** Null until the commit is approved: the poll opens then. */
  closes_at: string | null;
  is_closed: boolean;
  has_voted: boolean;
  total_votes: number | null;
  options: PollOption[];
}

export interface PollOption {
  id: string;
  label: string;
  votes_count: number | null;
  /** Whether it is the viewer's vote. */
  voted: boolean;
  /** Rounded, so the options may not add up to 100. */
  percentage: number | null;
}

/** What is left of a deleted commit (CommitResource's tombstone). */
export interface DeletedCommit {
  id: string;
  parent_id: string | null;
  deleted_at: string;
}

/** Signed requests send `deleted_at: null` on every live commit: a commit is deleted when the date is set, not when the key is there. */
export function isDeleted(commit: Commit | DeletedCommit): commit is DeletedCommit {
  return typeof commit.deleted_at === 'string';
}

export interface CommitImage {
  id: string;
  width: number;
  height: number;
  description: string | null;
  /** On dev-null.sh, which github.com's CSP does not allow as an image source. */
  url: string;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  is_pending: boolean;
}

/** A Laravel cursor-paginated resource collection. */
export interface Page<T> {
  data: T[];
  meta: { next_cursor: string | null };
}

export interface NewCommitImage {
  bytes: Uint8Array;
  /** image/jpeg, image/png or image/webp. */
  type: string;
  /** Its alt text. */
  description?: string | null;
}

export interface NewCommit {
  body: string;
  parent_id?: string;
  quoted_commit_id?: string;
  /** Only on a commit that is neither a reply nor a quote, without images; its body is still required. */
  poll?: NewPoll;
}

/** How long a poll stays open once its commit is approved, in minutes: 1 hour, 1, 3 or 7 days. */
export const POLL_DURATIONS = [60, 1440, 4320, 10080] as const;
export type PollDuration = (typeof POLL_DURATIONS)[number];

export interface NewPoll {
  /** 2 to 4 options, 50 characters each at most, distinct ignoring case. */
  options: string[];
  duration: PollDuration;
}

/**
 * A commit body cut into prose and code (App\Services\CodeSpans). Links, mentions and emoji are left in `text`, for
 * the client to find; `block.html` is the highlighter's escaped output, with `hl-*` classes only.
 */
export type BodySegment =
  | { type: 'text'; text: string }
  | { type: 'code'; code: string }
  | { type: 'block'; language: string | null; filename: string | null; html: string };

export interface BodyMention {
  /** Without the @, in its original case. */
  handle: string;
  /** In code points of `body`, the @ included. */
  offset: number;
  length: number;
  /** Unknown handles come as `user`: only organizations are looked up. */
  kind: 'user' | 'organization';
}

export interface CommitPreview {
  /** The body as /dev/null stores it, emoji shortcodes replaced. */
  body: string;
  body_segments: BodySegment[];
  /** The folded excerpt lists show, or null when the body fits. */
  preview_segments: BodySegment[] | null;
  mentions: BodyMention[];
}

export interface Device {
  id: string;
  name: string;
  fingerprint: string;
  approved_at: string;
  last_used_at: string | null;
}
