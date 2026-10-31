import { describe, expect, it } from 'vitest';
import { DEFAULT_SERVER, hostPermission, isDefaultServer, resolveServer, SERVER, serverName } from '../src/lib/server.ts';

describe('resolveServer', () => {
  it('falls back on dev-null.sh without a URL', () => {
    expect(resolveServer(undefined)).toBe('https://dev-null.sh');
    expect(resolveServer('')).toBe('https://dev-null.sh');
    expect(resolveServer('   ')).toBe('https://dev-null.sh');
  });

  it("keeps the URL's origin: scheme, host and port", () => {
    expect(resolveServer('http://dev-null.test')).toBe('http://dev-null.test');
    expect(resolveServer(' http://localhost:8000/ ')).toBe('http://localhost:8000');
    expect(resolveServer('https://staging.dev-null.sh/api/v1')).toBe('https://staging.dev-null.sh');
  });

  it('falls back on dev-null.sh, rather than failing, for what is not an http(s) URL', () => {
    expect(resolveServer('dev-null.test')).toBe(DEFAULT_SERVER);
    expect(resolveServer('ftp://dev-null.test')).toBe(DEFAULT_SERVER);
  });
});

describe('the server in use', () => {
  it('is dev-null.sh when nothing else is configured, as in the tests', () => {
    expect(SERVER).toBe(DEFAULT_SERVER);
    expect(isDefaultServer(SERVER)).toBe(true);
  });

  it('asks the browser for access to the whole server, by its origin', () => {
    expect(hostPermission('https://dev-null.sh')).toBe('https://dev-null.sh/*');
    expect(hostPermission('http://localhost:8000')).toBe('http://localhost:8000/*');
  });

  it('names a server by its host, the port included', () => {
    expect(serverName('https://dev-null.sh')).toBe('dev-null.sh');
    expect(serverName('http://localhost:8000')).toBe('localhost:8000');
    expect(isDefaultServer('http://localhost:8000')).toBe(false);
  });
});
