# TODO

The extension compared with dev-null.sh, in priority order. Check items off as they land, and keep this list as the
thread to follow. The UI principles in the [contributing guide](CONTRIBUTING.md#ui-principles) apply to every item.

## 1. Lose no content in the log

- [x] Check what `GET /api/v1/organizations/{handle}/mentions` returns, signed, for `quoted_commit`, `images` and
      `link_preview`: all three are loaded; `quoted_commit` is a full commit, a tombstone, or null when hidden.
- [x] Quoted commits: show the quoted commit as a card under the commit, as dev-null.sh does. Without it, a commit
      like "I love that you can use markdown to quote a block of text" loses its meaning.
- [x] Images: show a commit's images, with their descriptions as alt text. github.com's CSP only allows its own hosts,
      `data:` and `blob:` as image sources: the background fetches them from dev-null.sh as data URLs.
- [x] Link previews: show the card of the first link. Its image comes from any host, so the same CSP applies: it
      only shows from GitHub's own hosts (`*.githubusercontent.com`, `*.githubassets.com`).
- [x] Polls: show a commit's poll, and its results once /dev/null shows them (to voters, to its author, once closed).

## 2. Act on a commit from the log

- [x] Star and unstar: the client already has `star()` and `unstar()`; add the button on the star counter.
- [x] Vote on a poll from the log, as dev-null.sh does: once and for good, never on one's own or a closed poll.
- [x] Reply and Quote: link to the commit on dev-null.sh first; composing them in the extension comes later.
- [x] Reply to a commit from a log, in the extension: a composer for the reply (`parent_id`), the reply added under
      its commit once sent.
- [ ] In a reply, "Replying to @a, @b": choose which of the parent's other mentioned people get it too
      (`reply_recipients`, user ids), as dev-null.sh's reply-recipient-picker does.
- [ ] Quote a commit from a log the same way (`quoted_commit_id`; no `parent_id`, no poll).

## 3. Threads

- [x] Show the reply preview under each commit, and the older replies on demand, as dev-null.sh does.
- [x] Show the three newest replies under each commit, as dev-null.sh does: the API previews one, so the extension
      loads the next ones.
- [x] Say which commit a mention replies to ("↳ replying to @handle").
- [x] Show a reply's own replies count ("1 reply"), linking to it, as dev-null.sh does.
- [x] Label the load-more button as dev-null.sh does: "Show the last N" when one page loads them all.
- [ ] Draw the thread as dev-null.sh does: a dot on the commit's rail, and a dashed elbow from it to each reply.
- [ ] Share a commit from its actions, as dev-null.sh does.
- [ ] "Show thread": it needs the commit's `continuation_id` (its author's earliest self-reply), which the API does
      not expose. For the same reason, the replies loaded on demand may include that continuation. Ask dev-null.sh to
      expose it.

## 3b. Discussions

- [x] Share a discussion from its header (an organization's, linked in its repository's form, or a repository's).
- [x] An "On /dev/null" section in an organization's discussions sidebar.
- [ ] An "On /dev/null" section in a discussion's sidebar, listing the commits that link it. The API can't find
      commits by URL: it needs an endpoint in dev-null.sh, e.g. `GET /api/v1/links?url=` built on the web prototype's
      `LinkCommitsQuery` (exact URL, first link of a commit only). Query both the organization's and the repository's
      form of the discussion's URL.

## 3c. People

- [x] Follow an organization's members on /dev/null, from its People page, next to GitHub's own Follow.
- [x] Follow a user on /dev/null from their GitHub profile, under GitHub's own Follow.
- [x] The other pages that list people with a Follow: a profile's followers and following, a repository's stargazers
      (GitHub shows them for one's own repositories only) and watchers. A repository's contributors graph has no Follow.
- [x] Follow an organization on /dev/null (`POST|DELETE /api/v1/organizations/{handle}/follow`), from its page.

## 4. Composer

- [x] Preview in the modal composer too (only the inline composer has it).
- [x] Images: up to 3 JPEG, PNG or WebP, 10 MB each, with descriptions. The request becomes multipart and is signed
      with the `devnull-api-images` namespace and the images' SHA-256.
- [ ] Poll: 2 to 4 options of 50 characters at most, for 1 hour, 1, 3 or 7 days; not with images, a reply or a quote.
- [ ] Schedule: `/api/v1/scheduled-commits`, up to 30 days ahead, 10 pending at most.

- [ ] In the preview, show where the first link's card will go, as dev-null.sh does ("Unfurls into a link card
      after you commit.").
- [ ] Format GitLab and Codeberg links as dev-null.sh does, as GitHub's are.

## 5. Polish

- [x] The organization's @mention, added below the text, is visible and removable in both composers: the counter
      ("12 / 4000" on an empty composer) is no longer a surprise.
- [x] Put the share button with the header actions of issues and pull requests, next to "New issue", not against the
      title; and on repositories with Watch, Fork and Star. It measures as GitHub's own buttons there.
- [x] Date separators in the log, as dev-null.sh does.
- [x] Follow the session: connecting from the popup should show the log and the buttons without reloading the page.

## Popup

- [x] Redesign the popup as dev-null.sh's profile card (design B), with a settings view to turn off every decoration.
- [x] Tell guests how many developers are on /dev/null ("Join 12,000+ developers.").
- [ ] Read that count from the API instead of hard-coding it (`DEVELOPERS` in the popup, 12,000 on 2026-10-31): the
      count (`DevelopersCountQuery`) is not in the API; it needs an unsigned endpoint in dev-null.sh, e.g.
      `GET /api/v1/stats` returning `{ developers_count }`.
- [x] Restyle the sign-in steps (the code to approve, the permission to grant, a failure) as design B.

## Not now

- The organization's profile (bio, followers, admins, Follow): GitHub's page already shows the organization.
- Translate, and the pastéis reactions.
- "Follow back" for someone who follows the user: hardly useful on GitHub, and it needs `follows_you`, which only a
  lookup per person gives (`search/profiles`).
- Report a commit: it stays on dev-null.sh.
- Keyboard shortcuts (`r` to reply, inserting the additions): they would interfere with GitHub's own.
