# TODO

The extension compared with dev-null.sh, in priority order. Check items off as they land, and keep this list as the
thread to follow. The UI principles in the [README](README.md#ui-principles) apply to every item.

## 1. Lose no content in the log

- [x] Check what `GET /api/v1/organizations/{handle}/mentions` returns, signed, for `quoted_commit`, `images` and
      `link_preview`: all three are loaded; `quoted_commit` is a full commit, a tombstone, or null when hidden.
- [x] Quoted commits: show the quoted commit as a card under the commit, as dev-null.sh does. Without it, a commit
      like "I love that you can use markdown to quote a block of text" loses its meaning.
- [x] Images: show a commit's images, with their descriptions as alt text. github.com's CSP only allows its own hosts,
      `data:` and `blob:` as image sources: the background fetches them from dev-null.sh as data URLs.
- [x] Link previews: show the card of the first link. Its image comes from any host, so the same CSP applies: it
      only shows from GitHub's own hosts (`*.githubusercontent.com`, `*.githubassets.com`).

## 2. Act on a commit from the log

- [x] Star and unstar: the client already has `star()` and `unstar()`; add the button on the star counter.
- [x] Reply and Quote: link to the commit on dev-null.sh first; composing them in the extension comes later.

## 3. Threads

- [x] Show the reply preview under each commit, and the older replies on demand, as dev-null.sh does.
- [x] Say which commit a mention replies to ("↳ replying to @handle").
- [x] Show a reply's own replies count ("1 reply"), linking to it, as dev-null.sh does.
- [x] Label the load-more button as dev-null.sh does: "Show the last N" when one page loads them all.
- [ ] "Show thread": it needs the commit's `continuation_id` (its author's earliest self-reply), which the API does
      not expose. For the same reason, the replies loaded on demand may include that continuation. Ask dev-null.sh to
      expose it.

## 4. Composer

- [ ] Preview in the modal composer too (only the inline composer has it).
- [ ] Images: up to 3 JPEG, PNG or WebP, 10 MB each, with descriptions. The request becomes multipart and is signed
      with the `devnull-api-images` namespace and the images' SHA-256.
- [ ] Poll: 2 to 4 options of 50 characters at most, for 1 hour, 1, 3 or 7 days; not with images, a reply or a quote.
- [ ] Schedule: `/api/v1/scheduled-commits`, up to 30 days ahead, 10 pending at most.

## 5. Polish

- [ ] The counter shows "12 / 4000" on an empty composer, because it counts the organization's @mention added below
      the text.
- [ ] Put the share button with the header actions of issues and pull requests, next to "New issue", not against the
      title.
- [ ] Date separators in the log, as dev-null.sh does.
- [ ] Follow the session: connecting from the popup should show the log and the buttons without reloading the page.

## Not now

- The organization's profile (bio, followers, admins, Follow): GitHub's page already shows the organization.
- Translate, and the pastéis reactions.
