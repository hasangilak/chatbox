# Workbench — LLM Studio

A warm, editorial-feeling chat application for working with LLMs. Built as an HTML/CSS/React prototype.

## Features

- **Three layouts** — Atelier (editorial paper), Ledger (dense journal with margin notes), Workshop (wider canvas)
- **Light & dark themes** with a warm paper palette
- **Messages** with collapsible reasoning blocks, expandable tool-call cards, approval dialogs, clarification chips, and live status
- **Message tree** view with branching, editing, and downstream ripple
- **Agent builder** — system prompts with variables, prompt optimizer, versioning, tool picker, model + temperature/top-p/max-tokens
- **Canvas / artifact pane** with preview, diff, and history tabs
- **Right inspector** — timeline, live agent params, thread notes

## Running

Open `Workbench.html` in any modern browser. React + Babel are loaded via CDN; no build step.

## Structure

- `Workbench.html` — entry point
- `styles.css` — full design system (tokens, layouts, components)
- `data.js` — sample conversations, agents, message tree
- `icons.jsx` — inline SVG icon set
- `sidebar.jsx` — conversation list + search + tags
- `messages.jsx` — reasoning / tool / approval / clarify / status
- `inspector.jsx` — right-side timeline / agent / notes panel
- `tree.jsx` — message tree overlay
- `agents.jsx` — agent gallery + builder
- `canvas.jsx` — artifact pane
- `app.jsx` — app shell, topbar, composer
