# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Workbench — a React 18 + TypeScript + Vite **frontend only**. It is a thin client over the [yap server](https://github.com/hasangilak/yap), a separate checkout. All domain state lives on the server; this repo owns rendering, the SSE event reducer, and the design system.

## Commands

```bash
npm run dev        # vite dev server on :5173
npm run build      # tsc -b && vite build
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint . --max-warnings=0   (warnings fail)
npm run format     # prettier --write .
```

There is **no test suite**. Verification = `npm run typecheck && npm run lint`, plus running against a live yap instance.

Anything beyond a blank sidebar needs that backend running: postgres, Ollama with a model pulled, yap's own `.env` (Prisma's `DATABASE_URL` has no fallback), then `pnpm dev` in a terminal of its own. Follow **"Connecting to the yap server"** in `README.md` — those steps are kept correct there; do not restate them here.

## Architecture

**`src/api/` — the only place that talks to the network.** `client.ts` owns `fetch`, `ApiError`, and URL building; every non-GET automatically gets an `Idempotency-Key` header. Components never call `fetch` directly — add a typed function to the relevant `api/*.ts` module instead. Wire types live in `src/api/wire.ts`; `src/types.ts` holds the shapes shared between client and wire.

**SSE is fetch-based, not `EventSource`.** `subscribeStream()` in `client.ts` reads the response body and splits on `\n\n` frames — this exists so `Authorization` headers work. It returns an abort function.

**The thread is an event-sourced tree.** `state/threadReducer.ts` `applyEvent()` is a pure exhaustive switch over the 16 `BusEvent` kinds in `api/events.ts`. It has **no `default` case on purpose**: adding an event kind without handling it makes the return type include `undefined` and fails typecheck. Keep it pure — side effects belong in `useThread`.

**Data flow for a conversation:**
`useThread(convId)` → `GET /conversations/:id` seeds the tree → `subscribeStream` dispatches every `BusEvent` through `applyEvent` → `App.tsx` walks `parent` pointers up from `tree.activeLeaf` (`computeLinearThread`) to get the messages actually rendered. Branches exist in `tree.nodes` but are only visible via `TreeView`.

**Cross-cutting refresh trick:** `artifact.updated` events bump `state.artifactBumpKey`, an integer passed to `CanvasPane` as `bumpKey` to trigger a refetch. Same pattern if another pane needs event-driven reload.

**No global store, no data-fetching library.** `App.tsx` holds all UI state (`tweaks`, active conversation, overlay visibility) and passes it down. Collections use `state/useAsync.ts` — fetch-on-mount + manual `reload()`, no cache. Mutations that the server won't echo over SSE (node edit/regenerate) call `thread.reload()` explicitly.

**Styling is one global stylesheet.** `src/styles.css` (~1200 lines) — plain class names, no CSS modules or Tailwind. Themes are CSS custom properties under `:root` / `[data-theme="dark"]`, with `data-theme` set on `documentElement` by an effect in `App.tsx`. The three layouts are `layout-atelier` / `layout-ledger` / `layout-workshop` classes on the root `.app` div. Add styles to the matching commented section rather than inline, except for genuinely one-off positioning.

**Overlays** (TreeView, AgentGallery, AgentBuilder, TweaksPanel, SearchPalette) are conditionally rendered at the bottom of `App.tsx`, not routed.

## Conventions

- TS is strict with `noUnusedLocals` / `noUnusedParameters`; unused args must be `_`-prefixed to pass lint.
- Exported components and API functions carry explicit return types (`: JSX.Element`, `: Promise<T>`).
- Prettier: double quotes, semicolons, trailing commas, 100 cols. `CLAUDE.md` and `README.md` are in scope for `prettier --write .` — keep them formatted so docs edits don't leak into unrelated commits.

## Git

Commit gradually: one small, logical commit per coherent unit of work, conventional-commit prefix (`docs:`, `feat:`, `fix:`, `chore:`). Commit messages must not mention Claude, Claude Code, or any AI authorship — no `Co-Authored-By` trailer.

## Known stubs

Real backend data has largely replaced the mocks, but some placeholders remain and should be wired rather than imitated: `MARGIN_NOTES` in `message/Message.tsx`, `enabledToolCount = 4` and the hardcoded `tool="run_tests"` status line in `App.tsx`. `src/data/sample.ts` is dead — nothing imports it.

## Reference

`docs/server-spec.md` (~800 lines) is the authoritative contract: data model, every HTTP endpoint, and the event protocol, derived from this client. Read it before changing anything in `src/api/` or adding a feature that needs server support.
