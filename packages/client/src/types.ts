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

export interface Device {
  id: string;
  name: string;
  fingerprint: string;
  approved_at: string;
  last_used_at: string | null;
}
