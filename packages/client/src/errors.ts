/** The error codes of the signed API (App\Enums\ApiErrorCode), plus the device grant's. */
export type ApiErrorCode =
  | 'invalid_signature'
  | 'device_not_approved'
  | 'invalid_grant'
  | 'authorization_pending'
  | 'slow_down'
  | 'access_denied'
  | 'user_blocked'
  | 'user_unavailable'
  | 'own_commit'
  | 'commit_unavailable'
  | 'pasteis_exhausted'
  | 'rate_limited'
  | 'github_sync_failed'
  | 'timed_out'
  | 'banned'
  | 'commit_rules_required'
  | (string & {});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | null,
    message: string,
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async from(response: Response): Promise<ApiError> {
    let payload: Record<string, unknown> = {};
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      // Not JSON: an HTML error page, a proxy, a network middlebox.
    }

    const { message, code, ...data } = payload;

    return new ApiError(
      response.status,
      typeof code === 'string' ? code : null,
      typeof message === 'string' ? message : `${response.status} ${response.statusText}`.trim(),
      data,
    );
  }
}
