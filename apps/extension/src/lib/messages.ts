import type { Commit, CommitPreview, CurrentUser, DeletedCommit, MentionSuggestions, NewPoll, Page, ScheduledCommit } from '@dev-null-ext/client';
import { browser } from 'wxt/browser';
import type { FollowState } from './follows.ts';
import type { TransferredImage } from './images.ts';
import type { RestoredStash, StashImageInput } from './stash-store.ts';

/**
 * Everything the GitHub pages and the popup ask the background for. The key lives in the background only: content
 * scripts run with github.com's origin, so nothing they store is the extension's.
 */
export type Request =
  | { type: 'session' }
  | { type: 'mentions'; organization: string; cursor: string | null }
  | { type: 'commit'; body: string; images?: TransferredImage[]; parentId?: string; quotedCommitId?: string; poll?: NewPoll }
  /** `scheduledAt` as ISO 8601: messages are JSON. */
  | { type: 'schedule'; body: string; images?: TransferredImage[]; poll?: NewPoll; scheduledAt: string }
  | { type: 'preview'; body: string }
  | { type: 'mention-suggestions'; query: string; reply?: string }
  | { type: 'image'; url: string }
  | { type: 'star'; commitId: string; starred: boolean }
  | { type: 'vote'; commitId: string; optionId: string }
  | { type: 'replies'; commitId: string; cursor: string | null }
  | { type: 'owner-type'; login: string }
  | { type: 'follows'; handles: string[] }
  | { type: 'organization-follows'; handle: string }
  | { type: 'follow'; handle: string; follow: boolean; organization?: boolean }
  | { type: 'sign-in' }
  | { type: 'sign-in:loopback' }
  | { type: 'sign-in:cancel' }
  | { type: 'sign-out' }
  | { type: 'stash:get'; name: string }
  | { type: 'stash:put'; name: string; text: string; images: StashImageInput[]; scheduledAt?: string }
  | { type: 'stash:drop'; name: string }
  | { type: 'stash:which'; names: string[] };

export type OwnerType = 'Organization' | 'User' | null;

export interface Responses {
  session: CurrentUser | null;
  mentions: Page<Commit>;
  commit: Commit;
  schedule: ScheduledCommit;
  preview: CommitPreview;
  'mention-suggestions': MentionSuggestions;
  /** A data URL: github.com's CSP blocks images from dev-null.sh. */
  image: string;
  star: null;
  /** The commit, with its poll's results. */
  vote: Commit;
  /** Newest first, to follow a reply preview. */
  replies: Page<Commit | DeletedCommit>;
  'owner-type': OwnerType;
  /** Each handle's state, keyed as asked; null when signed out. */
  follows: Record<string, FollowState> | null;
  /** Whether the user follows the organization; null when signed out. */
  'organization-follows': FollowState | null;
  follow: FollowState;
  'sign-in': SignInState;
  'sign-in:loopback': SignInState;
  'sign-in:cancel': SignInState;
  'sign-out': null;
  'stash:get': RestoredStash | null;
  'stash:put': null;
  'stash:drop': null;
  /** The names asked that have a stash. */
  'stash:which': Record<string, true>;
}

/** Where a sign-in stands, kept in storage so the popup can close and reopen without losing it. */
export type SignInState =
  | { status: 'idle' }
  | { status: 'waiting'; flow: 'device-grant'; userCode: string; verificationUri: string }
  | { status: 'waiting'; flow: 'loopback' }
  /** The server has no device grant, and the fallback needs a permission the popup has to ask for. */
  | { status: 'needs-permission' }
  | { status: 'failed'; message: string };

export interface ErrorPayload {
  message: string;
  status?: number;
  code?: string | null;
}

export type Response<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };

export class BackgroundError extends Error {
  readonly status: number | undefined;
  readonly code: string | null | undefined;

  constructor(payload: ErrorPayload) {
    super(payload.message);
    this.name = 'BackgroundError';
    this.status = payload.status;
    this.code = payload.code;
  }
}

export async function ask<R extends Request>(request: R): Promise<Responses[R['type']]> {
  const response = (await browser.runtime.sendMessage(request)) as Response<Responses[R['type']]> | undefined;

  if (!response) throw new BackgroundError({ message: 'The extension did not answer. Reload the page.' });
  if (!response.ok) throw new BackgroundError(response.error);

  return response.data;
}
