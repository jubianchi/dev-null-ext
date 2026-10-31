/** Shapes of the /api/v1 resources the extension uses (App\Http\Resources\*). Only the fields it reads. */

export interface User {
  id: string;
  handle: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_url: string;
  html_url: string;
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
  starred?: boolean;
  /** Only on signed requests: the body as /dev/null renders it, whole and folded (null when it fits). */
  body_segments?: BodySegment[];
  preview_segments?: BodySegment[] | null;
  mentions?: BodyMention[];
}

/** A Laravel cursor-paginated resource collection. */
export interface Page<T> {
  data: T[];
  meta: { next_cursor: string | null };
}

export interface NewCommit {
  body: string;
  parent_id?: string;
  quoted_commit_id?: string;
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
