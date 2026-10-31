# Privacy policy

*Effective October 31, 2026.*

This policy covers **/dev/null**, the browser extension published from this repository (dev-null-ext). It brings
[/dev/null](https://dev-null.sh) to GitHub. It explains what the extension handles, where it sends it, and why.

In short: the extension has no server of its own, no analytics, no tracking and no ads. It only talks to dev-null.sh,
the service you use it for, and to GitHub's public API.

## What the extension handles

### Your /dev/null account

- **Your profile**: once you sign in, the extension reads your /dev/null profile from dev-null.sh (handle, name,
  avatar, bio, counts) and keeps a copy in the browser's extension storage, to show it in the popup and in the
  composer.
- **Your signing key**: signing in generates a key pair in your browser, with WebCrypto. The private key is created
  non-extractable and stays in the extension's IndexedDB: nobody can read it back, the extension included; it can only
  sign. The public key is sent to dev-null.sh, which lists it among your devices, named after your browser and
  operating system (for example "Browser extension (Chrome, mac)"). Every request to dev-null.sh is then signed with
  it.

### What you write and share

- **Your commits**: the text you write, the images you attach and their descriptions are sent to dev-null.sh when you
  preview or publish a commit, and only then. Published commits are public on /dev/null, as on dev-null.sh itself.
- **Mention suggestions**: when you type `@` in a composer, what follows it is sent to dev-null.sh to suggest who to
  mention.
- **The page you share**: the extension reads the GitHub page you are on (its address, title and author) to offer
  them in the composer. They are sent to dev-null.sh only if you insert them in a commit and publish it.

### GitHub pages

- The extension reads the GitHub pages you open to add /dev/null to them: a tab on organizations, a Commit button,
  a section next to discussions. It doesn't record or send the list of pages you visit.
- To know whether the owner of a page is an organization or a user, it asks GitHub's public API
  (`api.github.com/users/<owner>`) for that owner, and keeps the answer in the browser's extension storage so it
  doesn't ask again.
- To show an organization's commits, it asks dev-null.sh for the commits that mention that organization.

### Your settings

Which of the extension's additions you turned off is kept in the browser's synced extension storage, so it follows
you across your browsers if your browser syncs extension data.

## Where data goes

| Recipient | What | Why |
| --- | --- | --- |
| **dev-null.sh** | Your public key and device name; signed requests; the commits, images and descriptions you publish or preview; what you type after `@`; the organizations whose log you open | To provide /dev/null in GitHub: sign-in, reading logs, publishing, previews, mention suggestions |
| **api.github.com** | The login of the owner of the GitHub page you share | To tell organizations from users |
| **Your browser** | Your profile, sign-in state, settings, the organization/user cache and your private key | To work without asking again |

dev-null.sh handles what it receives under its own terms and privacy policy; GitHub under the
[GitHub General Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).

Nothing is sold, shared with anyone else, used for advertising, or used for any purpose other than the features
described above. The extension doesn't run code from anywhere: all of it ships in the package.

## Permissions

- **storage**: to keep your settings, profile and sign-in state, as described above.
- **Access to github.com**: to add /dev/null to GitHub's pages.
- **Access to dev-null.sh and api.github.com**: to call them, as described above.
- **webNavigation** (optional, never granted at install): only asked for, with your consent, when dev-null.sh can't
  sign you in with its device flow. dev-null.sh then sends a one-time code to a local address
  (`http://127.0.0.1:<port>/dev-null-ext/callback`); the extension watches for that single address, reads the code,
  closes the tab and stops watching.

## Your control

- **Sign out** from the popup: the extension revokes its device on dev-null.sh, then deletes its key and forgets your
  profile.
- **Turn off** any of the extension's additions to GitHub from the popup's settings.
- **Uninstall** the extension: the browser deletes everything it kept.
- Your /dev/null account, commits and devices are managed on [dev-null.sh](https://dev-null.sh).

## Children

The extension is meant for developers using GitHub and /dev/null, and isn't directed at children.

## Changes

Changes to this policy are made in this file, in this repository, where its history stays public. The date above
says when it last changed.

## Contact

Questions or concerns: [open an issue](https://github.com/jubianchi/dev-null-ext/issues) on this repository.
