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

## Project layout

```
├── index.html                    Vite entry — loads /src/main.tsx
├── src/
│   ├── main.tsx                  React 18 strict-mode entry
│   ├── App.tsx                   Top-level shell: topbar, sidebar, thread, overlays
│   ├── styles.css                Full design system (tokens, layouts, components)
│   ├── types.ts                  Shared TypeScript types
│   ├── data/sample.ts            Sample conversations, agents, message tree, tools
│   ├── utils/syntaxHighlight.ts  JSON / code syntax highlighter
│   └── components/
│       ├── Icon.tsx              Inline SVG icon set
│       ├── Sidebar.tsx           Conversation list + search + tags
│       ├── CanvasPane.tsx        Artifact pane with preview/diff/history
│       ├── TweaksPanel.tsx       Theme/layout/status toggles
│       ├── TreeView.tsx          Message tree overlay with SVG edges
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
