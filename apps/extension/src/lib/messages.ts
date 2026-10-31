import type { Commit, CommitPreview, CurrentUser, DeletedCommit, Page } from '@devnull-github/client';
import { browser } from 'wxt/browser';
import type { TransferredImage } from './images.ts';

/**
 * Everything the GitHub pages and the popup ask the background for. The key lives in the background only: content
 * scripts run with github.com's origin, so nothing they store is the extension's.
 */
export type Request =
  | { type: 'session' }
  | { type: 'mentions'; organization: string; cursor: string | null }
  | { type: 'commit'; body: string; images?: TransferredImage[] }
  | { type: 'preview'; body: string }
  | { type: 'image'; url: string }
  | { type: 'star'; commitId: string; starred: boolean }
  | { type: 'replies'; commitId: string; cursor: string | null }
  | { type: 'owner-type'; login: string }
  | { type: 'sign-in' }
  | { type: 'sign-in:loopback' }
  | { type: 'sign-in:cancel' }
  | { type: 'sign-out' };

export type OwnerType = 'Organization' | 'User' | null;

export interface Responses {
  session: CurrentUser | null;
  mentions: Page<Commit>;
  commit: Commit;
  preview: CommitPreview;
  /** A data URL: github.com's CSP blocks images from dev-null.sh. */
  image: string;
  star: null;
  /** Newest first, to follow a reply preview. */
  replies: Page<Commit | DeletedCommit>;
  'owner-type': OwnerType;
  'sign-in': SignInState;
  'sign-in:loopback': SignInState;
  'sign-in:cancel': SignInState;
  'sign-out': null;
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
