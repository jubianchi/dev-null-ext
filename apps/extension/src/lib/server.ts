/**
 * The /dev/null server the extension talks to: dev-null.sh, unless a build sets another one with WXT_DEVNULL_URL (in
 * apps/extension/.env, see CONTRIBUTING.md), to try the extension against a development server. It is fixed at build
 * time, so the manifest only asks for access to that one server.
 */
export const DEFAULT_SERVER = 'https://dev-null.sh';

/** The origin of the configured server; dev-null.sh when none is set, or when what is set is not an http(s) URL. */
export function resolveServer(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_SERVER;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : DEFAULT_SERVER;
  } catch {
    return DEFAULT_SERVER;
  }
}

/** The host permission, as the manifest and the permissions API spell it. */
export function hostPermission(server: string): string {
  return `${server}/*`;
}

/** The server as the user reads it: its host, and port when it has one. */
export function serverName(server: string): string {
  return new URL(server).host;
}

export function isDefaultServer(server: string): boolean {
  return server === DEFAULT_SERVER;
}

/** The server this build talks to. */
export const SERVER = resolveServer(import.meta.env?.WXT_DEVNULL_URL);
