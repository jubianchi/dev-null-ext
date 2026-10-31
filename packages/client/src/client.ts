import { type Clock, systemClock } from './clock.ts';
import { buffer, toHex } from './encoding.ts';
import { ApiError } from './errors.ts';
import { signatureHeaders } from './signed-request.ts';
import type { Signer } from './signer.ts';
import type { Commit, CommitPreview, CurrentUser, Device, MentionSuggestions, NewCommit, NewCommitImage, Organization, Page, User } from './types.ts';

export const DEFAULT_BASE_URL = 'https://dev-null.sh';

export interface DevNullClientOptions {
  baseUrl?: string;
  /** The device key. Without one, only the public endpoints answer, as they do for a guest. */
  signer?: Signer | null;
  fetch?: typeof fetch;
  clock?: Clock;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | null | undefined>;
  /** Sign even when the endpoint is public, to get what the web shows the user. Defaults to signing whenever a key is set. */
  signed?: boolean;
  signal?: AbortSignal;
  /**
   * Files to send: the request becomes multipart, the JSON body going in a `payload` file part, and its signature
   * covering the files' hashes (App\Services\SignedRequests).
   */
  files?: UploadFile[];
}

export interface UploadFile {
  /** The part's name, e.g. `images[]`. */
  field: string;
  bytes: Uint8Array;
  type: string;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer(bytes))));
}

/** The JSON as a file part named `payload` (the server takes no plain field), then the files in order. */
function multipartBody(json: string, files: UploadFile[]): FormData {
  const form = new FormData();
  form.append('payload', new File([json], 'payload', { type: 'application/json' }));
  for (const [index, file] of files.entries()) form.append(file.field, new File([buffer(file.bytes)], `${index}`, { type: file.type }));
  return form;
}

interface Wrapped<T> {
  data: T;
}

/**
 * The /dev/null API. Transport, key and clock are injected, so the client runs anywhere WebCrypto and fetch do.
 */
export class DevNullClient {
  readonly baseUrl: string;
  readonly signer: Signer | null;
  readonly #fetch: typeof fetch;
  readonly #clock: Clock;

  constructor(options: DevNullClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.signer = options.signer ?? null;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#clock = options.clock ?? systemClock;
  }

  withSigner(signer: Signer | null): DevNullClient {
    return new DevNullClient({ baseUrl: this.baseUrl, signer, fetch: this.#fetch, clock: this.#clock });
  }

  /** Answers with the parsed JSON, or null for 204, and throws an ApiError for any other status than 2xx. */
  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(options.query ?? {})) {
      if (value !== null && value !== undefined) url.searchParams.set(name, value);
    }

    const body = options.body === undefined ? '' : JSON.stringify(options.body);
    const files = options.files ?? [];
    const multipart = files.length > 0;
    const headers: Record<string, string> = { Accept: 'application/json' };
    // A multipart request's boundary is the browser's to set.
    if (body !== '' && !multipart) headers['Content-Type'] = 'application/json';

    const sign = options.signed ?? this.signer !== null;
    if (sign) {
      if (!this.signer) throw new Error('This request has to be signed, and the client has no key.');
      const hashes = multipart ? (await Promise.all(files.map((file) => sha256Hex(file.bytes)))).join(',') : undefined;
      Object.assign(
        headers,
        await signatureHeaders(
          this.signer,
          { method, pathAndQuery: url.pathname + url.search, body, ...(hashes === undefined ? {} : { hashes }) },
          this.#clock.now(),
        ),
      );
    }

    const init: RequestInit = { method, headers, credentials: 'omit' };
    if (multipart) init.body = multipartBody(body, files);
    else if (body !== '') init.body = body;
    if (options.signal) init.signal = options.signal;

    const response = await this.#fetch(url, init);

    if (!response.ok) throw await ApiError.from(response);
    if (response.status === 204) return null as T;

    return (await response.json()) as T;
  }

  // Public, or as the web shows them to the user when signed...

  async organization(handle: string): Promise<Organization> {
    return (await this.request<Wrapped<Organization>>('GET', `/api/v1/organizations/${encodeURIComponent(handle)}`)).data;
  }

  organizationMentions(handle: string, cursor?: string | null): Promise<Page<Commit>> {
    return this.request('GET', `/api/v1/organizations/${encodeURIComponent(handle)}/mentions`, { query: { cursor } });
  }

  async commit(id: string): Promise<Commit> {
    return (await this.request<Wrapped<Commit>>('GET', `/api/v1/commits/${encodeURIComponent(id)}`)).data;
  }

  // Signed...

  async me(): Promise<CurrentUser> {
    return (await this.request<Wrapped<CurrentUser>>('GET', '/api/v1/me', { signed: true })).data;
  }

  /**
   * Commits, with up to 3 images (JPEG, PNG or WebP, 10 MB each) and their descriptions, in order; with images, the
   * body may be empty.
   */
  async createCommit(commit: NewCommit, images: NewCommitImage[] = []): Promise<Commit> {
    const body = images.length > 0 ? { ...commit, image_descriptions: images.map((image) => image.description ?? null) } : commit;
    const files = images.map((image) => ({ field: 'images[]', bytes: image.bytes, type: image.type }));

    return (await this.request<Wrapped<Commit>>('POST', '/api/v1/commits', { body, files, signed: true })).data;
  }

  /**
   * A commit's replies and quotes, 50 a page. `newest` sorts them newest first, which a reply preview's `next_cursor`
   * pages on.
   */
  commitReplies(id: string, options: { cursor?: string | null; newest?: boolean } = {}): Promise<Page<Commit>> {
    return this.request('GET', `/api/v1/commits/${encodeURIComponent(id)}/replies`, {
      query: { newest: options.newest ? '1' : null, cursor: options.cursor },
      signed: true,
    });
  }

  /** How /dev/null will render a body, without storing anything or counting toward the commit rate limit. */
  async previewCommit(body: string): Promise<CommitPreview> {
    return (await this.request<Wrapped<CommitPreview>>('POST', '/api/v1/commits/preview', { body: { body }, signed: true })).data;
  }

  /**
   * Who to mention, as dev-null.sh's composer suggests: for an empty query, the people the user follows, most recently
   * followed first; otherwise the users and organizations whose handle or name contains it, followed ones first.
   */
  async mentionSuggestions(query: string): Promise<MentionSuggestions> {
    const { data, organizations } = await this.request<{ data: User[]; organizations: Organization[] }>('GET', '/api/v1/search/mentions', {
      query: { q: query },
      signed: true,
    });
    return { users: data, organizations };
  }

  async devices(): Promise<Device[]> {
    return (await this.request<Wrapped<Device[]>>('GET', '/api/v1/me/devices', { signed: true })).data;
  }

  /** Revokes a device. Revoking the one that signs the request signs this client out. */
  async revokeDevice(id: string): Promise<void> {
    await this.request('DELETE', `/api/v1/me/devices/${encodeURIComponent(id)}`, { signed: true });
  }

  async star(commitId: string): Promise<void> {
    await this.request('POST', `/api/v1/commits/${encodeURIComponent(commitId)}/star`, { signed: true });
  }

  async unstar(commitId: string): Promise<void> {
    await this.request('DELETE', `/api/v1/commits/${encodeURIComponent(commitId)}/star`, { signed: true });
  }
}
