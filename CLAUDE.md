# dev-null-ext

The /dev/null browser extension (WXT, Preact, Tailwind CSS v4), which brings dev-null.sh into github.com for now. Its
displayed name is `/dev/null`; the project, its packages (`@dev-null-ext/*`) and archives are `dev-null-ext`. Read
[CONTRIBUTING.md](CONTRIBUTING.md) before changing code: architecture, workflow and UI principles are there, not here.

## Commands

- Run from the repository root: `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`; all four MUST pass before a
  commit. `pnpm format` applies Biome's formatting and safe fixes.
- A single test file: `pnpm vitest run test/<name>.test.tsx` from `apps/extension` (or `packages/client`).
## Workflow

- [TODO.md](TODO.md) is the roadmap: pick work from it in order, and check the item off in the commit that lands it.
- Test first: write the failing test, run it to see it fail, then implement.
- Commit titles: Conventional Commits in English, scoped by package (`extension`, `client`), e.g.
  `feat(extension): attach images to a commit`.
- When dev-null.sh is the reference for a behaviour or a look, match it; ask the user for a screenshot rather than
  guessing.

## Rules

- `packages/client` MUST NOT use DOM or extension APIs.
- Content scripts MUST NOT call /dev/null directly: they `ask` the background (`src/lib/messages.ts`), which signs.
- GitHub selectors MUST live in `apps/extension/src/lib/github/` (`anchors.ts` returns selectors, never elements).
- Every decoration MUST have an entry in `FEATURES` (`src/lib/settings.ts`), so the popup can turn it off. Never rename
  a feature id: it is the stored setting's key.
- Nothing is inserted in a commit by default: additions are inserted by the user from the composer's toolbar.
- The /dev/null server MUST come from `SERVER` (`apps/extension/src/lib/server.ts`), never a hardcoded
  `https://dev-null.sh`: a build may target a development server (`WXT_DEVNULL_URL` in `apps/extension/.env`).
- When checking a change in a real browser, you MUST NOT publish anything, neither on dev-null.sh nor on GitHub; to
  try publishing, use a build for a development server.
- Adding a host, a permission or a dependency needs the user's approval.

## Pitfalls

- WXT's `:host { all: initial !important }` wins over any style set on the shadow host: style from inside the shadow
  root (e.g. a wrapper element).
- github.com's CSP only allows GitHub hosts, `data:` and `blob:` images: proxy remote images through the background
  (`src/lib/image-proxy.ts`).
- A `<dialog>` clips absolutely positioned menus: use the Popover API with a fixed position (`src/lib/menu-position.ts`).
- Use `focus-visible:` rather than `focus:` for menu items, and flex with `gap` rather than `space-y` (a child's `m-0`
  cancels it).
- /dev/null sends `deleted_at: null` on every commit: use the client's `isDeleted`, which tests the value, not the key.
- In happy-dom tests, a component awaiting the background usually needs one more `await act(async () => {})`.
