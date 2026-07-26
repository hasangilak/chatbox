export type Role = "user" | "asst";

export type ToolStatus = "ok" | "pending" | "err" | "done";

export type StatusState = "thinking" | "pondering" | "tool" | "approval" | "streaming";

export type Layout = "atelier" | "ledger" | "workshop";

export type Theme = "light" | "dark";

export interface Conversation {
  id: string;
  title: string;
  snippet: string;
  agent: string;
  tag: string;
  pinned?: boolean;
  updated: string;
  folder: string;
}

export interface Agent {
  id: string;
  name: string;
  initial: string;
  desc: string;
  model: string;
  tools: number;
  temp: number;
}

export interface ToolCallData {
  name: string;
  args: Record<string, unknown>;
  status: ToolStatus;
  elapsed?: string;
  result?: string;
}

export interface ClarifyChip {
  id: string;
  label: string;
  selected?: boolean;
}

export interface ClarifyData {
  question: string;
  chips: ClarifyChip[];
  /** Placeholder text for the free-text field — NOT the user's answer. */
  input: string;
}

export type ApprovalDecision = "allow" | "always" | "deny";

export interface ApprovalData {
  tool: string;
  title: string;
  body: string;
  preview?: string;
}

/* ---------- Prompts: the one pause-for-a-human concept ---------- */

export type PromptKind = "approval" | "clarify";

/**
 * Nested rather than flat on purpose: checking `prompt_kind` narrows to prove
 * which sibling field exists, so a mismatched pair can't parse into a
 * half-populated object.
 */
export type PromptRequest =
  | { prompt_kind: "approval"; approval: ApprovalData }
  | { prompt_kind: "clarify"; clarify: ClarifyData };

export interface ClarifyAnswer {
  selected_chip_ids: string[];
  text: string;
}

export type PromptResponse =
  | {
      prompt_kind: "approval";
      decision: ApprovalDecision;
      /** Present only if the user rewrote the args. The tool ran with THESE. */
      edited_args?: Record<string, unknown>;
    }
  | { prompt_kind: "clarify"; answer: ClarifyAnswer };

/**
 * A pause awaiting a human, as the client holds it.
 *
 * Normalized from either a `prompt.requested` event or a `PromptRow` fetched on
 * mount, so one shape covers both the live and the rebuilt-after-reload path.
 * `response` is null while the prompt is open.
 */
export interface Prompt {
  id: string;
  node_id: string;
  tool: string;
  /**
   * Null only when a `prompt.responded` arrived for a prompt whose request we
   * never saw — a replay cursor can start past it. Such a prompt is settled by
   * definition, so it renders from `response` alone; an open prompt always has
   * one.
   */
  request: PromptRequest | null;
  response: PromptResponse | null;
  /** Epoch ms. The pause has no timeout, so cards should show their age. */
  requested_at: number;
}

/** A user's mid-turn steering, recorded so the seam in the text is explicable. */
export interface Interjection {
  id: string;
  text: string;
  /** true = a live model call was cut off; false = queued for the next round. */
  aborted: boolean;
  at: number;
}

/** Why a turn ended early. `turn.cancelled` always precedes `node.finalized`. */
export interface Cancellation {
  aborted: boolean;
  at: number;
}

export interface MessageNode {
  id: string;
  parent: string | null;
  role: Role;
  time: string;
  branch: string;
  content: string;
  reasoning?: string[];
  toolCall?: ToolCallData;
  /**
   * Both of these are on the wire but neither is prompt state: `approval` is
   * never written by the runtime, and `clarify` only lands *after* the answer.
   * Render open prompts from `ThreadState.prompts` instead — a tree fetch is
   * empty at exactly the moment you'd want to draw a card.
   */
  clarify?: ClarifyData;
  approval?: ApprovalData;
  streaming?: boolean;
  status?: StatusState;
  edited?: boolean;
}

export interface MessageTree {
  rootId: string;
  activeLeaf: string;
  nodes: Record<string, MessageNode>;
}

export interface ToolDef {
  id: string;
  name: string;
  desc: string;
  enabled: boolean;
  auto: boolean;
}

export interface TweakState {
  theme: Theme;
  layout: Layout;
  grain: boolean;
  reasonOpen: boolean;
  canvas: boolean;
  margins: boolean;
}
