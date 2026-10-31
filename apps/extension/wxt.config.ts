import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import { buildIdentity, isDevBuild } from './src/lib/build.ts';
import { hostPermission, resolveServer } from './src/lib/server.ts';

// WXT loads apps/extension/.env into process.env before it builds the manifest; without it, dev-null.sh.
const server = () => resolveServer(process.env.WXT_DEVNULL_URL);

export default defineConfig({
  srcDir: 'src',
  vite: () => ({ plugins: [preact(), tailwindcss()] }),
  zip: {
    artifactTemplate: 'dev-null-ext-{{version}}-{{browser}}.zip',
    sourcesTemplate: 'dev-null-ext-{{version}}-sources.zip',
    // Firefox Add-ons rebuilds the extension from its sources: the whole workspace, with the client and the lockfile.
    sourcesRoot: '../..',
    // includeSources replaces WXT's default (every file), and hidden files are skipped unless named.
    includeSources: ['**/*', '.npmrc'],
    excludeSources: ['**/node_modules/**', '**/.output/**', '**/.wxt/**', '**/coverage/**', '**/.env', 'docs/**'],
  },
  manifest: ({ browser, mode }) => {
    // What the stores and the browser show; the project itself is dev-null-ext. A development build (pnpm dev, or
    // another server) says so, by its name and an amber icon, to sit apart from the published one.
    const { name, icons } = buildIdentity(isDevBuild(mode, server()));

    return {
      name,
      icons,
      // The Chrome Web Store takes 132 characters at most.
      description: 'Read what /dev/null says about an organization, and share what you see on it, without leaving GitHub.',
      permissions: ['storage'],
      // Only for signing in on a /dev/null server without the device grant (dev-null-sh/dev-null.sh#585), and asked for
      // at that moment: it reads where tabs navigate, which a user should only grant knowingly.
      optional_permissions: ['webNavigation'],
      host_permissions: ['https://github.com/*', hostPermission(server()), 'https://api.github.com/*'],
      action: { default_title: name, default_icon: icons },
      // Ed25519 in WebCrypto: Chrome 137, Firefox 129.
      ...(browser === 'firefox'
        ? { browser_specific_settings: { gecko: { id: 'dev-null-ext@jubianchi.fr', strict_min_version: '129.0' } } }
        : { minimum_chrome_version: '137' }),
    };
  },
});
