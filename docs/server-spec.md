# Workbench · Server Specification

This document enumerates every feature the Workbench client expects from a backend and specifies the data model, HTTP surface, and real-time event protocol needed to support it. It is derived from the current client code (`src/`) — every item below corresponds to an affordance that exists in the UI today.

Status markers in the UI:

- `UI-only` — behaves locally today (e.g. theme toggle). Listed for completeness; needs no server work unless we want cross-device persistence.
- `stub` — UI is wired but always reads sample data / no-ops. Server contract is what this document is for.

---

## 1. High-level goals

A Workbench server must support, at minimum:

1. **Chat transcripts as a message tree** — every user edit creates a branch; every regeneration creates a sibling; the active leaf defines the linear thread shown to the user.
2. **Streaming LLM output** — token-by-token content *and* reasoning, with a live status state (thinking / pondering / calling tool / waiting for approval / streaming).
3. **Tool calls mediated by the server** — model proposes, server executes (or blocks on approval), result is written back into the tree.
4. **Tool permissions** — per-tool, per-agent, per-session. "Allow once" vs "allow always" is a first-class concept.
5. **Structured clarification turns** — multi-select chips + free-form input, collected back from the user without leaving the turn.
6. **Agents as versioned, variable-templated prompt bundles** — each save creates a new version; you can diff, restore, eval.
7. **Artifacts (canvas)** — code/text files the assistant produces, with version history and diffs against previous versions.
8. **Conversation library** — folders, tags, search, pin, share, export.
9. **Inspector timeline** — an ordered event log of the conversation, queryable without re-walking the tree.
10. **Notes** — per-thread notes and pinned snippets pulled from specific messages.

Non-goals for v1 (can be added later): multi-user presence, comments, collaborative editing of the same branch, workspace-scoped access control beyond single-user.

---

## 2. Core data model

The client types already encode the canonical shapes; `src/types.ts` is the source of truth for field names and discriminants. Below we restate them with server-side additions (IDs, timestamps, ownership) and call out fields the client does not yet expose.

### 2.1 Workspace / User (implied)

Not surfaced in UI today, but every entity below belongs to a workspace. Minimum:

```
Workspace { id, name, created_at, plan }
User      { id, email, display_name, avatar, workspace_id, role }
```

### 2.2 Conversation

Source: `Conversation` in `src/types.ts`; sample in `src/data/sample.ts`.

```
Conversation {
  id                  string   // "c-01"
  workspace_id        string
  owner_id            string
  title               string
  snippet             string   // derived, last ~80 chars of latest asst message
  agent_id            string   // current primary agent (changeable per turn)
  tag                 string   // "work" | "writing" | ... user-defined
  pinned              boolean
  folder              "Pinned" | "Today" | "This week" | "Earlier"  // derived client-side from updated_at except Pinned
  updated_at          timestamp
  created_at          timestamp
  root_node_id        string
  active_leaf_id      string   // defines the linear thread
  token_budget        int      // e.g. 200_000
  tokens_used         int      // updated as nodes are added
  share_token         string?  // present iff shared
}
```

Notes:
- `folder` in the UI comes from a date bucket (Today / This week / Earlier) plus an explicit `pinned` flag. The server should store `pinned` and let the client bucket the rest by `updated_at`.
- `snippet` is a derived field; server may compute it on write for cheap list rendering.

### 2.3 Message node (tree)

Source: `MessageNode` in `src/types.ts`; `SAMPLE_TREE` for shape.

```
MessageNode {
  id                string       // "n-01"
  conversation_id   string
  parent_id         string?      // null for root
  role              "user" | "asst"
  time              string       // display-formatted; server also stores created_at
  created_at        timestamp
  branch            string       // "main", "alt-1", ... stable per branch
  content           string       // markdown; supports **bold** and `code`
  reasoning         string[]?    // steps, final state; streamed during generation
  tool_call         ToolCall?
  clarify           ClarifyData?
  approval          ApprovalData?
  streaming         boolean?     // true while still being generated
  status            StatusState? // last known live status while streaming
  edited            boolean?     // user edited this node; created a new branch
  edited_from_id    string?      // if edited==true, points to the pre-edit sibling
}
```

### 2.4 ToolCall (embedded in a node)

```
ToolCall {
  name       string
  args       object
  status     "pending" | "ok" | "err" | "done"
  elapsed    string?   // human-readable
  elapsed_ms int?      // machine-readable
  result     string?   // stdout/returned text
  error      string?   // if status == "err"
  approval_id string?  // references the approval that gated this call
}
```

### 2.5 ApprovalData (embedded when pending)

```
ApprovalData {
  id        string
  tool      string    // e.g. "write_file"
  title     string    // "Apply retry policy refactor"
  body      string
  preview   string?   // e.g. file list / diff stats
  created_at timestamp
  decision  "allow" | "always" | "deny" | null
  decided_at timestamp?
  remember_key string?  // "tool:write_file:agent:a-01" when decision=="always"
}
```

### 2.6 ClarifyData (embedded)

```
ClarifyData {
  id        string
  question  string
  chips     [ { id, label, selected? } ]
  input     string     // placeholder / prompt for free-form text
  response  {
    selected_chip_ids: string[]
    text: string
  } | null
}
```

### 2.7 Agent

Source: `Agent` + form fields in `AgentBuilder`.

```
Agent {
  id                 string
  workspace_id       string
  name               string
  initial            string   // avatar mark, e.g. "C"
  desc               string
  model              string                  // from SAMPLE_MODELS
  temperature        float   0..1            // default 0.5
  top_p              float   0..1            // default 1.0
  max_tokens         int     256..16384      // default 4096
  system_prompt      string  // with {{variable}} placeholders
  variables          [Variable]
  tools              [AgentTool]             // subset of global tool registry
  permission_default "ask_every_time" | "auto_allow_read" | "auto_allow_all"
  current_version_id string
  created_at, updated_at
}

Variable { name, default, description }

AgentTool { tool_id, enabled, auto_approve }
```

### 2.8 AgentVersion

Every save creates a version.

```
AgentVersion {
  id            string
  agent_id      string
  version       int      // v1, v2, ...
  message       string   // "Add clarifier_count variable"
  snapshot      Agent    // full materialized snapshot at save time
  eval_score    float?   // pass rate against held-out set
  created_at    timestamp
  created_by    user_id
  parent_version_id string?
}
```

### 2.9 Tool (global registry)

```
Tool {
  id          string   // "read_file"
  name        string
  description string
  schema      JSONSchema  // args validation
  side_effects boolean    // if true, UI nudges toward requiring approval
  default_auto_approve bool
}
```

### 2.10 Artifact (canvas)

```
Artifact {
  id             string
  conversation_id string
  title          string   // "retry.ts"
  mime           string   // "text/typescript"
  current_version_id string
  created_at, updated_at
}

ArtifactVersion {
  id           string
  artifact_id  string
  version      int
  content      string
  diff_from    string?   // previous version id
  message      string    // "Added OTel spans around each attempt"
  author       "user" | "asst"
  created_at   timestamp
  produced_by_node_id string?   // which tree node wrote this version
}
```

### 2.11 Note

```
ThreadNote {
  conversation_id string
  body            string   // free-form, local-feeling but stored server-side
  updated_at      timestamp
}

PinnedSnippet {
  id              string
  conversation_id string
  source_node_id  string
  label           string   // "Retry policy · from msg 03"
  excerpt         string   // the actual snippet
  created_at      timestamp
}
```

### 2.12 Tag

```
Tag { id, workspace_id, name, color? }
```

Conversation ↔ Tag is 1:1 today (a conversation has a single `tag`), but schema should be many-to-many to avoid a v2 migration.

### 2.13 Timeline event (derived, but worth storing)

The Inspector Timeline is an ordered log of everything that happened in a conversation. A dedicated `conversation_events` table lets the timeline render without walking the tree.

```
Event {
  id              string
  conversation_id string
  node_id         string?
  kind            "user" | "reason" | "tool" | "clar" | "perm" | "stream"
  label           string   // display label
  sub             string   // secondary line
  status          "ok" | "pending" | "err"?
  at              timestamp
}
```

---

## 3. Message-tree semantics

The tree is the heart of the server. Every interaction adds a node; the active leaf pointer on the conversation tells the client what linear chain to show.

### 3.1 Appending a turn (happy path)

1. Client `POST /conversations/:id/messages` with `{parent_id, role: "user", content}`.
2. Server writes the user node, sets `active_leaf_id` to it, returns the node and opens an SSE/WebSocket channel for the assistant reply.
3. Server begins generation against the agent's configured model. It emits events (see §5) for reasoning deltas, content deltas, tool calls, approvals, and status. It also persists them.
4. When generation finishes, the server finalizes the assistant node and moves `active_leaf_id` onto it.

### 3.2 Editing a user message (branch)

UI in `Message.tsx` and `TreeView.tsx`. Editing a user message creates a **new branch**, it never mutates the original.

1. Client `POST /nodes/:id/edit` with `{content, ripple: bool}`.
2. Server:
   a. Creates a new node with `parent_id = original.parent_id`, `branch = next_branch_name()`, `edited = true`, `edited_from_id = original.id`.
   b. If `ripple` is true, enqueues regeneration of all descendants of the original along the new branch. Descendants are re-executed in order; tool calls and approvals are requested anew (they are *not* inherited).
   c. Sets `active_leaf_id` to the newly generated leaf as each step completes.
3. Events stream exactly like §3.1 for every re-generated node.

Branch naming: reserve `main` for the original thread. Subsequent branches are `alt-1`, `alt-2`, ... per conversation. Branches are immutable once named.

### 3.3 Branching from any node

"Branch from here" in `Message.tsx` and TreeView actions. Creates a branch sibling without editing anything:

- `POST /nodes/:id/branch` → creates a new user node under `id`'s parent with empty content, `active_leaf_id` moves to it, client focuses the composer.

### 3.4 Regenerating from a node

TreeView action "Regenerate from here". Uses the same handler as §3.1 but with `parent_id = node.parent_id` (same parent, new assistant reply).

### 3.5 Pruning

TreeView action. Deletes a subtree irreversibly (for user-initiated cleanup). `DELETE /nodes/:id?subtree=true`. Disallow if `active_leaf_id` is in the subtree unless the caller specifies a fallback leaf.

### 3.6 Ripple preview

When editing with `ripple=true`, the UI shows "3 descendant nodes will be re-generated." Server exposes `GET /nodes/:id/ripple-preview` that returns:

```
{
  descendant_count: int
  tool_calls_to_replay: int
  approvals_required: int
}
```

### 3.7 Integrity rules

- A node's `parent_id` must be in the same `conversation_id`.
- Only user nodes can be edited; assistant nodes can be regenerated.
- `active_leaf_id` must point to a leaf that is *reachable from* `root_node_id`.
- Branches are append-only; once a node is written, it cannot be mutated except via status transitions on embedded `tool_call.status`, `approval.decision`, `clarify.response`, `streaming`, and `status`.

---

## 4. Streaming protocol

Generation is streamed over either SSE (preferred for simplicity) or WebSocket. Each conversation has a channel: `/conversations/:id/stream` (SSE) or a topic on the workspace WebSocket.

### 4.1 Event envelope

```
event: <kind>
data:  { at, node_id, ...payload }
```

### 4.2 Events

| Event                  | When                                                   | Payload fields                                                              |
|------------------------|--------------------------------------------------------|-----------------------------------------------------------------------------|
| `node.created`         | New node materialized (user or asst placeholder)       | `node` (MessageNode, possibly empty content)                                |
| `status.update`        | Live status chip changes                               | `node_id`, `state: StatusState`, `tool?`, `elapsed_ms`                      |
| `reasoning.delta`      | A new reasoning step begins or continues streaming     | `node_id`, `step_index`, `delta`                                            |
| `reasoning.step.end`   | One step complete                                      | `node_id`, `step_index`, `final_text`                                       |
| `content.delta`        | Visible content tokens                                 | `node_id`, `delta`                                                          |
| `toolcall.proposed`    | Model asked for a tool                                 | `node_id`, `tool_call` with `status="pending"` + `approval?` if required    |
| `approval.requested`   | Tool requires user approval                            | `node_id`, `approval` (ApprovalData with `id`, `decision=null`)             |
| `approval.decided`     | User decided                                           | `node_id`, `approval_id`, `decision`                                        |
| `toolcall.started`     | Server began executing the tool                        | `node_id`, `tool`, `args`                                                   |
| `toolcall.ended`       | Tool finished                                          | `node_id`, `status`, `elapsed_ms`, `result?`, `error?`                      |
| `clarify.requested`    | Assistant asked a clarifying question                  | `node_id`, `clarify` (ClarifyData)                                          |
| `clarify.answered`     | User answered                                          | `node_id`, `clarify.response`                                               |
| `node.finalized`       | Assistant node is complete                             | `node_id`, final `MessageNode`                                              |
| `active_leaf.changed`  | Pointer moved                                          | `conversation_id`, `active_leaf_id`                                         |
| `artifact.updated`     | A canvas artifact got a new version                    | `artifact_id`, `version_id`                                                 |
| `error`                | Generation failed                                      | `node_id`, `message`, `recoverable: bool`                                   |

Ordering guarantee per channel: events for a given `node_id` arrive in causal order. Clients should tolerate `reasoning.*` and `content.delta` interleaving (reasoning streams alongside thinking).

### 4.3 Reconnect

`GET /conversations/:id/stream?since_event=<last_event_id>` replays missed events. Events must therefore have a monotonic id (UUIDv7 or a per-conversation sequence).

---

## 5. HTTP API

All routes are under `/api/v1`. Authentication omitted for brevity; assume `Authorization: Bearer <token>` and a resolved `workspace_id` from the token.

### 5.1 Conversations

| Method | Path                                        | Purpose                                                              |
|--------|---------------------------------------------|----------------------------------------------------------------------|
| GET    | `/conversations?tag=&q=&folder=&pinned=`    | List with filters (tag, full-text, folder bucket, pinned only)       |
| POST   | `/conversations`                            | Create; body `{ agent_id, title? }`                                  |
| GET    | `/conversations/:id`                        | Full conversation with tree nodes                                    |
| PATCH  | `/conversations/:id`                        | Update `title`, `tag`, `pinned`, `agent_id`                          |
| DELETE | `/conversations/:id`                        | Soft-delete                                                          |
| POST   | `/conversations/:id/share`                  | Mint `share_token`; returns public URL                               |
| DELETE | `/conversations/:id/share`                  | Revoke                                                               |
| GET    | `/conversations/:id/export?format=md\|json` | Export thread along active leaf (md) or full tree (json)             |
| GET    | `/conversations/:id/tree`                   | Just the tree (nodes + edges + active_leaf_id)                       |
| GET    | `/conversations/:id/timeline`               | Event log for the Inspector Timeline                                 |
| GET    | `/conversations/:id/stream`                 | SSE stream (see §4)                                                  |

### 5.2 Nodes / messages

| Method | Path                           | Purpose                                                             |
|--------|--------------------------------|---------------------------------------------------------------------|
| POST   | `/conversations/:id/messages`  | Append a user message; triggers assistant reply. Body: `{parent_id?, content, attachments?}` (parent defaults to current active leaf) |
| POST   | `/nodes/:id/edit`              | Branch via edit. Body: `{content, ripple}`                          |
| POST   | `/nodes/:id/branch`            | Branch from this node (empty user turn)                             |
| POST   | `/nodes/:id/regenerate`        | Regenerate assistant response under this node's parent              |
| DELETE | `/nodes/:id?subtree=true`      | Prune                                                               |
| GET    | `/nodes/:id/ripple-preview`    | Ripple cost estimate (see §3.6)                                     |
| POST   | `/nodes/:id/copy`              | Copy content (no server effect beyond logging)                      |
| POST   | `/nodes/:id/reasoning/edit`    | Tamper with reasoning steps; same branching semantics as content    |

### 5.3 Approvals

| Method | Path                            | Purpose                                                         |
|--------|---------------------------------|-----------------------------------------------------------------|
| POST   | `/approvals/:id/decide`         | Body `{decision: "allow"\|"always"\|"deny"}`. Resumes the paused assistant turn. |
| GET    | `/approvals/grants`             | List active "allow always" grants (for settings UI)             |
| DELETE | `/approvals/grants/:key`        | Revoke a grant (e.g. `tool:write_file:agent:a-01`)              |

### 5.4 Clarifications

| Method | Path                           | Purpose                                              |
|--------|--------------------------------|------------------------------------------------------|
| POST   | `/clarify/:id/answer`          | Body `{selected_chip_ids, text}`; resumes the turn   |

### 5.5 Agents

| Method | Path                               | Purpose                                             |
|--------|------------------------------------|-----------------------------------------------------|
| GET    | `/agents`                          | Gallery — list all agents in workspace              |
| POST   | `/agents`                          | Create                                              |
| GET    | `/agents/:id`                      | Fetch current version                               |
| PATCH  | `/agents/:id`                      | Save → creates new version (see §7.9)               |
| DELETE | `/agents/:id`                      | Soft-delete                                         |
| GET    | `/agents/:id/versions`             | List versions                                       |
| GET    | `/agents/:id/versions/:v`          | Specific version snapshot                           |
| POST   | `/agents/:id/versions/:v/restore`  | Make this version current (creates a new version)   |
| GET    | `/agents/:id/versions/:v/diff?against=:w` | Diff two versions                            |
| POST   | `/agents/:id/optimize`             | Prompt optimizer. Body `{seed?}`; returns a `OptimizerSuggestion` |
| POST   | `/agents/:id/eval/run`             | Run held-out eval. Returns a job id                 |
| GET    | `/agents/:id/eval/runs/:job_id`    | Eval result                                         |

### 5.6 Agent templates

| Method | Path                         | Purpose                                                |
|--------|------------------------------|--------------------------------------------------------|
| GET    | `/agent-templates`           | Starter templates (Socratic Tutor, Data Analyst, ...)  |
| POST   | `/agents/from-template/:tpl` | Instantiate a template as a new draft agent            |

### 5.7 Tools

| Method | Path         | Purpose                                                              |
|--------|--------------|----------------------------------------------------------------------|
| GET    | `/tools`     | Global registry (read_file, write_file, run_tests, web_search, ...)  |

Tools are not mutable via API in v1; they're registered server-side.

### 5.8 Artifacts

| Method | Path                                       | Purpose                                      |
|--------|--------------------------------------------|----------------------------------------------|
| GET    | `/conversations/:id/artifacts`             | List artifacts in a conversation             |
| GET    | `/artifacts/:id`                           | Fetch current version                        |
| GET    | `/artifacts/:id/versions`                  | History                                      |
| GET    | `/artifacts/:id/versions/:v`               | Specific version                             |
| GET    | `/artifacts/:id/diff?from=:a&to=:b`        | Diff two versions                            |

Artifacts are written by tool calls (`write_file`) — no direct POST from the client.

### 5.9 Notes & pinned snippets

| Method | Path                                  | Purpose                                  |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/conversations/:id/notes`            | Thread note body                         |
| PUT    | `/conversations/:id/notes`            | Replace thread note                      |
| GET    | `/conversations/:id/pinned-snippets`  | List                                     |
| POST   | `/conversations/:id/pinned-snippets`  | Create from a node                       |
| DELETE | `/pinned-snippets/:id`                | Remove                                   |

### 5.10 Tags

| Method | Path                       | Purpose                               |
|--------|----------------------------|---------------------------------------|
| GET    | `/tags`                    | Workspace-level list                  |
| POST   | `/tags`                    | Create                                |
| PATCH  | `/tags/:id`                | Rename / recolor                      |
| DELETE | `/tags/:id`                | Remove                                |
| POST   | `/conversations/:id/tags`  | Attach                                |
| DELETE | `/conversations/:id/tags/:tag_id` | Detach                         |

### 5.11 Search

| Method | Path                            | Purpose                                                                                              |
|--------|---------------------------------|------------------------------------------------------------------------------------------------------|
| GET    | `/search?q=&scope=`             | Full-text across threads, messages, agents. `scope=conversations\|messages\|agents\|all`. Returns highlighted snippets. |

Server should index message content, conversation titles, and agent name/desc/system_prompt. Tokenize the markdown — not the raw bytes — so `**bold**` markers don't pollute matches.

---

## 6. Permissions model

Three layers, checked in this order per tool invocation:

1. **Session grant** (`approval.decide` with `"always"`) — stored as `(user_id, agent_id, tool_id)` → `allow`. Skips the approval UI entirely while the grant exists.
2. **Agent-level auto-approve** (`AgentTool.auto_approve`) — set per agent, per tool. Read-only tools default to `true`.
3. **Agent permission_default**:
   - `ask_every_time` — always pop an approval.
   - `auto_allow_read` — auto-approve tools marked `side_effects=false` in the global registry; ask for the rest.
   - `auto_allow_all` — no approval prompts (for trusted agents).

If any layer above says "auto-approve", the server skips the `approval.requested` event and goes straight to `toolcall.started`.

Grants are listable and revocable (§5.3) so the UI can show what's been "remembered."

---

## 7. Feature specifications

Each subsection cross-references the client surface and lists the backing server contract.

### 7.1 Conversation list & sidebar

Surface: `src/components/Sidebar.tsx`.

- **Folders** — Pinned is explicit; Today / This week / Earlier are derived from `updated_at` (bucket by local time).
- **Tags** — single-tag filter, clicking cycles the active tag.
- **Search box** — `⌘K` shortcut hint; calls §5.11 `search` with `scope=conversations`.
- **Pin / unpin** — `PATCH /conversations/:id {pinned}`.
- **New chat** — `POST /conversations {agent_id: currentAgent}`.

### 7.2 Thread head (active conversation)

Surface: `App.tsx` → `thread-head`.

- Shows conversation `title`, current agent chip with `initial` + `name` + `model`.
- Actions: Share (§5.1), Export (§5.1), Pin (§7.1), More.

### 7.3 Linear thread rendering

Surface: `Message.tsx`. The client walks from `active_leaf_id` up to root; server-side that walk is a `GET /conversations/:id/tree` (or can be batched into `GET /conversations/:id`).

Each message renders:

- Serial margin number (client-computed from its index in the chain).
- Author chip (`You` / `Assistant`) and time.
- Branch badge if `branch != "main"`; always a "2 branches ▾" affordance that opens the TreeView.
- Reasoning block (§7.4), content, and any of: tool call, clarify, approval, streaming status.
- Hover gutter: edit, copy, branch, more.
- Margin note (indices 1/3/5 today — replace with agent-authored margin notes if we ever generate them).

### 7.4 Reasoning block

Surface: `ReasoningBlock.tsx`.

- Collapsible. Defaults to closed unless (a) currently streaming (b) `tweaks.reasonOpen` is on client-side.
- Label swaps to "Pondering" while streaming; "Reasoning" once finalized.
- Shows step count + elapsed.

Server contract:
- Streamed as `reasoning.delta` events during generation (§4.2).
- Persisted as an ordered `string[]` on the node.
- Editable via §5.2 `POST /nodes/:id/reasoning/edit` — branches just like content edits.

### 7.5 Tool calls

Surface: `ToolCall.tsx`.

- Header line: `name(args)` with status dot + elapsed.
- Expandable body: Input (JSON, syntax-highlighted) and Output (raw string).
- Status values: `pending` (awaiting approval) / `ok` / `err` / `done`.

Server contract:
- Tool registry (§5.7) drives what's callable.
- `toolcall.proposed` → if approval needed, emit `approval.requested` and pause; otherwise `toolcall.started`.
- On completion, `toolcall.ended` with `status`, `elapsed_ms`, `result` / `error`.
- If the tool writes a file, also emit `artifact.updated` for the canvas.

Tools in the registry today:

| id           | side_effects | default_auto_approve |
|--------------|--------------|----------------------|
| `read_file`  | false        | false                |
| `write_file` | true         | false                |
| `run_tests`  | true         | true                 |
| `web_search` | false        | true                 |
| `web_fetch`  | false        | false                |
| `sql_query`  | false (ro)   | false                |
| `send_email` | true         | false                |

### 7.6 Approvals

Surface: `ApprovalCard.tsx`.

- Three actions: **Allow once**, **Allow always for `<tool>`**, **Deny**.
- After a decision, the card collapses to a compact line with the outcome.

Server contract (§5.3):
- `POST /approvals/:id/decide` with one of the three decisions.
- `allow` resumes the single pending call.
- `always` additionally creates a grant for `(user, agent, tool)` so subsequent calls skip approval.
- `deny` ends the tool call with `status="err"` and lets the assistant decide how to proceed (typically it apologizes and asks).

The assistant turn must block until the decision arrives (server-side state, not client polling).

### 7.7 Clarifications

Surface: `Clarify.tsx`.

- Question + multi-select chips (some pre-selected) + free-form text.
- **Send** emits the full answer: `{selected_chip_ids, text}`.

Server contract (§5.4):
- The assistant's turn pauses on a `clarify.requested` event.
- `POST /clarify/:id/answer` resumes generation; the answer becomes context for the model in the *same* turn (no new user message node is created unless we want one for visibility — TBD, see §10).

### 7.8 Live status line

Surface: `StatusLine.tsx` and `App.tsx` uses it as a ghost entry at the bottom of the thread.

- States: `thinking`, `pondering`, `tool` (`Calling <name>…`), `approval` (`Waiting for your approval…`), `streaming` (`Writing…`).
- Elapsed shown next to the label.

Server contract: `status.update` events (§4.2). The client treats the last event per conversation as the "now" state.

### 7.9 Agent gallery

Surface: `AgentGallery.tsx`.

- Grid of agents + a "New agent" dashed card + a "Starter templates" row below.
- Click any card → opens the builder.

Endpoints: §5.5–5.6.

### 7.10 Agent builder — identity

- Name (input) and short description (textarea).
- Avatar initial is derived from name today; we can make it explicit later.

### 7.11 Agent builder — system prompt with variables

- Contenteditable textarea with `{{variable}}` inline chips styled as pills.
- Variables table below: `name`, `default`, `description`.

Server contract:
- `system_prompt` is stored as the raw string with `{{name}}` placeholders.
- At request time, the server interpolates from:
  1. Per-conversation variable overrides (if we add them — not in UI yet)
  2. Agent defaults
- Unknown placeholders are left as-is (fail loud — easier to debug).
- Variable names: `^[a-z][a-z0-9_]*$`.

### 7.12 Prompt optimizer

Surface: `AgentBuilder.tsx` — "IMPROVE" button, shows an inline card with a suggestion and a predicted delta.

- `POST /agents/:id/optimize` body `{target_metric?, budget_ms?}` returns one suggestion:

```
OptimizerSuggestion {
  suggestion_text: string
  rationale: string
  predicted_delta_pct: float
  applies_to: "system_prompt"
  patch: { before: string, after: string }   // exact text edit
}
```

- Applying is a client-side diff-apply followed by a normal agent save.

### 7.13 Agent variables & eval

- Held-out eval: a fixed set of `EvalCase { input, expected_behavior }` attached to an agent (not yet in UI but implied — 8 cases shown).
- `POST /agents/:id/eval/run` kicks off an async job; UI polls or subscribes.
- Result: per-case pass/fail, pass rate, delta vs previous version.

### 7.14 Agent versions

- Each save (§5.5 `PATCH /agents/:id`) creates a new `AgentVersion` snapshot.
- UI shows message, timestamp, eval score.
- Actions: Restore, Diff against current.

### 7.15 Agent builder — params & tools (right column)

- Model dropdown (from `GET /models` or a static list — we currently ship `SAMPLE_MODELS`).
- Temperature, top-p, max tokens sliders.
- Tools list with enable + auto-approve toggles (drives §6).
- Permission default radio.

### 7.16 Canvas / artifact pane

Surface: `CanvasPane.tsx`.

- Tabs: Preview / Diff / History.
- Artifacts are created/updated by `write_file` tool calls.

Server contract: §5.8. Diff should be computed server-side (Myers or patience); client just renders.

### 7.17 Tree view overlay

Surface: `TreeView.tsx`.

- Full tree with SVG edges (dashed ochre for branch edges, solid for same-branch).
- Node inspector right side: content, reasoning (with Edit/Tamper), tool call, actions.
- Toolbar: ripple toggle, export, node count badge, branch count badge.

Mostly reads `GET /conversations/:id/tree`. Edit / tamper / regenerate / branch / prune hit §5.2.

### 7.18 Inspector — Timeline tab

Surface: `Timeline.tsx`. Today it's a hard-coded sample.

Server contract: §5.1 `GET /conversations/:id/timeline?since=`. Rows map 1:1 to `Event.kind`.

### 7.19 Inspector — Agent tab

Surface: `AgentPanel.tsx`.

- Shows the conversation's current agent identity + model + temperature.
- Tool toggles are **per-conversation overrides** of the agent defaults — they do not edit the agent itself. Model & temperature overrides also per-conversation. (Today stubbed.)

New concept: `ConversationAgentOverrides { conversation_id, agent_id, temperature?, top_p?, max_tokens?, tools?: AgentTool[] }`. Exposed as `PATCH /conversations/:id/agent-overrides`.

### 7.20 Inspector — Notes tab

Surface: `NotesPanel.tsx`. `PUT /conversations/:id/notes` and pinned snippets (§5.9).

### 7.21 Tweaks panel

Surface: `TweaksPanel.tsx`. **UI-only** today (theme, layout, grain, reasonOpen, margin notes). If we want per-user persistence across devices, add `GET/PUT /users/me/preferences`. Otherwise `localStorage` is fine.

### 7.22 Composer

Surface: `App.tsx`. Affordances:

- Agent chip (selector): `GET /agents`.
- Tools chip: shows enabled-tool count, click opens an override panel (§7.19).
- Repo/context chip: attachments — `POST /conversations/:id/attachments` with a repo ref or file.
- Reasoning-depth chip: `low | medium | high` — stored per-conversation and sent to the model.
- Token counter: `tokens_used / token_budget`. Updated on every `node.finalized`.
- Slash commands (`/`) and `@` mentions (agents) and `#` (files) — client-side autocomplete; server just needs the listing endpoints (already covered).

### 7.23 Share / export

- **Share**: §5.1 mints a read-only token; a public URL serves the thread along the active leaf. Tree, agent details, and approvals metadata should be stripped before serving.
- **Export**: `format=md` linearizes the active leaf; `format=json` returns the full tree + artifacts. Filenames: `<conversation_title>.<ext>`.

---

## 8. Persistence & schema hints

These are hints, not prescriptions. Any SQL store with JSONB columns works.

```
conversations(id PK, workspace_id, owner_id, title, agent_id, pinned, updated_at, active_leaf_id, root_node_id, share_token UNIQUE NULL, tokens_used, token_budget)
conversation_tags(conversation_id, tag_id)  -- many-to-many even though UI uses single
nodes(id PK, conversation_id FK, parent_id, role, branch, content, reasoning JSONB, tool_call JSONB, clarify JSONB, approval JSONB, status, streaming, edited, edited_from_id, created_at)
events(id PK, conversation_id, node_id, kind, label, sub, status, at)
approvals(id PK, node_id FK, tool, title, body, preview, decision, decided_at, remember_key)
approval_grants(user_id, agent_id, tool_id, PRIMARY KEY(user_id, agent_id, tool_id))
agents(id PK, workspace_id, name, initial, desc, current_version_id, ...)
agent_versions(id PK, agent_id FK, version, message, snapshot JSONB, eval_score, parent_version_id, created_at)
agent_tools(agent_id, tool_id, enabled, auto_approve)
agent_variables(agent_id, name, default, description)
tools(id PK, name, description, side_effects, default_auto_approve, schema JSONB)
artifacts(id PK, conversation_id, title, mime, current_version_id)
artifact_versions(id PK, artifact_id FK, version, content, diff_from, message, author, produced_by_node_id, created_at)
thread_notes(conversation_id PK, body, updated_at)
pinned_snippets(id PK, conversation_id FK, source_node_id, label, excerpt)
tags(id PK, workspace_id, name, color)
```

Indexes:
- `nodes(conversation_id, branch, created_at)` for tree walks.
- `events(conversation_id, at)` for timeline queries.
- `conversations(workspace_id, pinned, updated_at DESC)` for sidebar.
- Full-text on `nodes.content`, `conversations.title`, `agents.name`, `agents.system_prompt`.

---

## 9. Non-functional requirements

- **Idempotency**: all POSTs that mutate the tree (`messages`, `edit`, `branch`, `regenerate`, `decide`, `answer`) accept an `Idempotency-Key` header. Server stores `(key, response)` for 24h.
- **Ordering**: within a conversation channel, event ids are monotonic. Cross-conversation ordering is not guaranteed.
- **Reconnect**: see §4.3 — `since_event` replays.
- **Retries**: tool calls are retried server-side on transient failures per the tool's own policy (not the LLM's). Model calls are *not* retried automatically to avoid double-charging — the user sees the error and decides.
- **Budgets**: `token_budget` is enforced server-side; exceeding it stops generation and emits `error` with `recoverable: false`.
- **Deadlines**: each tool call carries a deadline (default 30s, override via agent config).
- **Auth**: bearer token on HTTP; same token (as query param or first WS message) on streams.
- **Rate limits**: per user, per conversation, per tool — 429 with `Retry-After`.

---

## 10. Open questions / decisions to make

These are things the current UI is silent on; the server team should pick one and we'll update the client:

1. **Clarify answer ↔ visible turn?** When the user answers a clarification, do we materialize a user node for it, or fold it invisibly into the assistant's context? The UI today shows chips inline under the assistant message and the "Send" button feels like a reply — I'd lean toward materializing a small user node so the transcript stays honest, but either works.
2. **Branch naming** — stable slugs (`alt-1`) vs user-nameable (`retry-with-breaker`)? Today stable only; UI has no rename affordance.
3. **Cross-device tweaks sync** — keep in `localStorage` or store under user prefs?
4. **Per-conversation agent overrides** vs spawning a new agent version — decision affects whether temperature-tweaking during a thread pollutes the agent's version history. The design above keeps them separate (see §7.19).
5. **Attachments model** — are repo attachments live references (read on demand) or snapshots (frozen at attach time)? Probably live for repos, snapshot for files.
6. **Multi-agent turns** — if a thread switches agents mid-way, do we store `agent_id` on each node or only on the conversation? Per-node is more flexible; costs a column.
7. **Eval cases authoring UI** — not in the client today. The AgentBuilder only shows the result. We'll need an endpoint to CRUD cases when we add that.
8. **Reasoning privacy** — do we store reasoning server-side forever, or redact it after some window? Some providers bill for reasoning tokens and/or forbid persistence.
