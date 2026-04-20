import type { MessageTree, Role } from "../types";

/* ---------- Agents ---------- */

export interface AgentVariable {
  name: string;
  default: string;
  description: string;
}

export type PermissionDefault =
  | "ask_every_time"
  | "auto_allow_read"
  | "auto_allow_all";

export interface AgentFull {
  id: string;
  name: string;
  initial: string;
  desc: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  system_prompt: string;
  variables: AgentVariable[];
  tool_ids: string[];
  permission_default: PermissionDefault;
  current_version_id: string | null;
}

export type AgentVersionSnapshot = Omit<AgentFull, "id" | "current_version_id">;

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: number;
  message: string;
  snapshot: AgentVersionSnapshot;
  eval_score: number | null;
  parent_version_id: string | null;
  created_at: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  initial: string;
  desc: string;
}

export interface PatchAgentRequest {
  name?: string;
  initial?: string;
  desc?: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  system_prompt?: string;
  variables?: AgentVariable[];
  tool_ids?: string[];
  permission_default?: PermissionDefault;
  message?: string;
}

export interface PatchAgentResponse {
  agent: AgentFull;
  version: AgentVersion;
}

export interface OptimizerSuggestion {
  suggestion_text: string;
  rationale: string;
  predicted_delta_pct: number;
  applies_to: "system_prompt";
  patch: { before: string; after: string };
}

export interface OptimizeResponse {
  agent_id: string;
  suggestion: OptimizerSuggestion;
}

export interface EvalResult {
  job_id: string;
  status: "queued" | "running" | "done" | "error";
  pass_rate: number | null;
  cases: Array<{
    input: string;
    expected_behavior: string;
    passed: boolean;
  }>;
  delta_vs_previous_pct: number | null;
}

/* ---------- Approvals ---------- */

export type ApprovalDecision = "allow" | "always" | "deny";

export interface Grant {
  key: string;
  agent_id: string;
  tool_id: string;
  created_at: string;
}

/* ---------- Artifacts ---------- */

export interface Artifact {
  id: string;
  conversation_id: string;
  title: string;
  mime: string;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactVersion {
  id: string;
  artifact_id: string;
  version: number;
  content: string;
  diff_from: string | null;
  message: string;
  author: "user" | "asst";
  produced_by_node_id: string | null;
  created_at: string;
}

export interface ArtifactDiffResponse {
  from: { version: number; id: string; created_at: string };
  to: { version: number; id: string; created_at: string };
  unified: string;
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
}

export interface ArtifactDetail {
  artifact: Artifact;
  current_version: ArtifactVersion | null;
}

/* ---------- Tags / notes / pinned ---------- */

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface ThreadNote {
  conversation_id: string;
  body: string;
  updated_at: string;
}

export interface PinnedSnippet {
  id: string;
  conversation_id: string;
  source_node_id: string;
  label: string;
  excerpt: string;
  created_at: string;
}

/* ---------- Timeline ---------- */

export type TimelineEventKind =
  | "user"
  | "reason"
  | "tool"
  | "clar"
  | "perm"
  | "stream"
  | "error";

export interface TimelineEvent {
  id: string;
  conversation_id: string;
  node_id: string | null;
  kind: TimelineEventKind;
  label: string;
  sub: string;
  status: "ok" | "pending" | "err" | null;
  at: number;
}

/* ---------- Search ---------- */

export type SearchScope = "all" | "conversations" | "messages" | "agents";

export interface SearchHit {
  scope: Exclude<SearchScope, "all">;
  id: string;
  title: string;
  snippet: string;
  highlight: string;
}

export interface SearchResponse {
  query: string;
  scope: string;
  hits: SearchHit[];
}

/* ---------- Share / export ---------- */

export interface ShareResponse {
  share_token: string;
  public_url: string;
}

export interface PublicSharedChainItem {
  role: Role;
  time: string;
  content: string;
  reasoning?: string[];
  tool?: { name: string; status: string };
}

export interface PublicSharedThread {
  title: string;
  agent: string;
  chain: PublicSharedChainItem[];
}

/* ---------- Conversation-with-tree combined response ---------- */

import type { Conversation } from "../types";

export interface ConversationDetail {
  conversation: Conversation;
  tree: MessageTree;
}

/* ---------- Tree ops ---------- */

export interface RipplePreview {
  descendant_count: number;
  tool_calls_to_replay: number;
  approvals_required: number;
}
