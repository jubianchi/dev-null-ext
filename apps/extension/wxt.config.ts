import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  vite: () => ({ plugins: [preact(), tailwindcss()] }),
  zip: {
    artifactTemplate: 'devnull-github-{{version}}-{{browser}}.zip',
    sourcesTemplate: 'devnull-github-{{version}}-sources.zip',
    // Firefox Add-ons rebuilds the extension from its sources: the whole workspace, with the client and the lockfile.
    sourcesRoot: '../..',
    includeSources: ['.npmrc'],
    excludeSources: ['**/.output/**', '**/.wxt/**', '**/coverage/**', '.idea/**', '.claude/**', 'docs/**'],
  },
  manifest: ({ browser }) => ({
    name: '/dev/null for GitHub',
    description:
      'Share repositories, pull requests and issues on /dev/null, and read what /dev/null says about an organization, without leaving GitHub.',
    permissions: ['storage'],
    // Only for signing in on a /dev/null server without the device grant (dev-null-sh/dev-null.sh#585), and asked for
    // at that moment: it reads where tabs navigate, which a user should only grant knowingly.
    optional_permissions: ['webNavigation'],
    host_permissions: ['https://github.com/*', 'https://dev-null.sh/*', 'https://api.github.com/*'],
    action: { default_title: '/dev/null for GitHub' },
    // Ed25519 in WebCrypto: Chrome 137, Firefox 129.
    ...(browser === 'firefox'
      ? { browser_specific_settings: { gecko: { id: 'devnull-github@jubianchi.fr', strict_min_version: '129.0' } } }
      : { minimum_chrome_version: '137' }),
  }),
});
