# Workbench — LLM Studio

A warm, editorial-feeling chat application for working with LLMs. Built as a production-ready React + TypeScript app with Vite.

## Features

- **Three layouts** — Atelier (editorial paper), Ledger (dense journal with margin notes), Workshop (wider canvas)
- **Light & dark themes** with a warm paper palette
- **Messages** with collapsible reasoning blocks, expandable tool-call cards, approval dialogs, clarification chips, and live status
- **Message tree** view with branching, editing, and downstream ripple
- **Agent builder** — system prompts with variables, prompt optimizer, versioning, tool picker, model + temperature / top-p / max-tokens
- **Canvas / artifact pane** with preview, diff, and history tabs
- **Right inspector** — timeline, live agent params, thread notes
- **Tweaks panel** — theme, layout, status chip, grain, reasoning defaults, canvas, margin notes

## Stack

- **Vite** for dev server + bundling
- **React 18** with strict mode
- **TypeScript** (strict) across the whole app
- **ESLint** (flat config) + **Prettier**

## Getting started

```bash
npm install
npm run dev        # start the dev server on http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # preview the built app
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --write .
```

Fonts (Fraunces, IBM Plex Sans, JetBrains Mono) are pulled from Google Fonts via `index.html`.

## Connecting to the yap server

This client talks to the [yap server](https://github.com/hasangilak/simplest-llm) (local path: `/Users/hassangilak/Work/simplest-llm`). Copy `.env.example` to `.env` and set:

```
VITE_YAP_BASE_URL=http://localhost:3001/api/v1
VITE_YAP_TOKEN=            # optional, only if server was started with YAP_API_TOKEN
```

In one terminal, bring yap up:

```bash
cd /Users/hassangilak/Work/simplest-llm
docker compose up -d postgres
pnpm install && pnpm db:push && pnpm dev     # yap on :3001
curl -sX POST http://localhost:3001/api/v1/dev/seed   # load sample data
```

Then `npm run dev` in this repo — the sidebar will populate from the server.

### What is wired

- Sidebar → `GET /conversations`, filter by tag
- Thread → `GET /conversations/:id` + SSE `/conversations/:id/stream`; reducer applies every `BusEvent`
- Composer → `POST /conversations/:id/messages`
- ApprovalCard → `POST /approvals/:id/decide`
- Clarify → `POST /clarify/:id/answer`
- Message edit / TreeView actions → `/nodes/:id/edit|branch|regenerate|prune`
- AgentGallery → `GET /agents` + `/agent-templates`
- AgentBuilder → `GET /agents/:id/full`, `PATCH /agents/:id`, versions, restore, optimize, eval
- Inspector Timeline → `GET /conversations/:id/timeline`
- Inspector Notes → `GET/PUT /notes` + pinned snippets CRUD
- Inspector Agent → `GET /agents` + `GET /agents/:id/full`
- CanvasPane → `GET /conversations/:id/artifacts` + `/artifacts/:id` + versions + diff; re-fetches on `artifact.updated`
- ⌘K SearchPalette → `GET /search`
- Thread head Share/Export → `POST /conversations/:id/share` and `/export?format=md`

Auth is optional: set `VITE_YAP_TOKEN` to send `Authorization: Bearer <token>` on every request. SSE uses fetch streaming (not `EventSource`) so auth headers work.

## Project layout

```
├── index.html                    Vite entry — loads /src/main.tsx
├── docs/server-spec.md           What the client expects from any backend
├── src/
│   ├── main.tsx                  React 18 strict-mode entry
│   ├── App.tsx                   Top-level shell: topbar, sidebar, thread, overlays
│   ├── styles.css                Full design system (tokens, layouts, components)
│   ├── types.ts                  Shared TypeScript types (client ↔ wire)
│   ├── env.ts                    VITE_YAP_BASE_URL / VITE_YAP_TOKEN
│   ├── vite-env.d.ts             import.meta.env typings
│   ├── api/                      HTTP + SSE client
│   │   ├── client.ts             fetch wrapper, ApiError, fetch-based SSE
│   │   ├── events.ts             BusEvent union (16 kinds)
│   │   ├── wire.ts               AgentFull, AgentVersion, Artifact, Tag, Timeline, ...
│   │   ├── conversations.ts · nodes.ts · agents.ts · approvals.ts
│   │   ├── clarify.ts · artifacts.ts · tags.ts · tools.ts · search.ts
│   │   └── index.ts              barrel
│   ├── state/                    React hooks + pure reducers
│   │   ├── threadReducer.ts      pure reducer over BusEvent
│   │   ├── useThread.ts          load conversation, subscribe to stream, send messages
│   │   ├── useAsync.ts           minimal fetch-on-mount + reload
│   │   └── useWorkspace.ts       useConversations, useAgents, useTags, useTools, ...
│   └── components/
│       ├── Icon.tsx              Inline SVG icon set
│       ├── Sidebar.tsx           Conversation list + search + tags
│       ├── Composer.tsx          Message composer
│       ├── CanvasPane.tsx        Artifact pane (preview/diff/history)
│       ├── TweaksPanel.tsx       Theme/layout/status toggles
│       ├── TreeView.tsx          Message tree overlay with SVG edges
│       ├── SearchPalette.tsx     ⌘K search modal
│       ├── message/              Thread messages
│       │   ├── Message.tsx       (container)
│       │   ├── ReasoningBlock.tsx
│       │   ├── ToolCall.tsx
│       │   ├── ApprovalCard.tsx
│       │   ├── Clarify.tsx
│       │   └── StatusLine.tsx
│       ├── inspector/            Right-side inspector
│       │   ├── Inspector.tsx     (tab host)
│       │   ├── Timeline.tsx
│       │   ├── AgentPanel.tsx
│       │   └── NotesPanel.tsx
│       └── agents/               Agent gallery + builder
│           ├── AgentGallery.tsx
│           └── AgentBuilder.tsx
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
└── .prettierrc.json
```

## Design notes

- The design system lives in `src/styles.css` (paper-light + walnut-dark themes via `[data-theme]`).
- Sample data is read-only; replace `src/data/sample.ts` with real APIs to wire it to a live backend.
- All overlays (TreeView, AgentGallery, AgentBuilder, TweaksPanel) are conditionally rendered from `App.tsx`.
