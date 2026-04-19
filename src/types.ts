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
  input: string;
}

export interface ApprovalData {
  tool: string;
  title: string;
  body: string;
  preview?: string;
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
  status: StatusState;
  grain: boolean;
  reasonOpen: boolean;
  canvas: boolean;
  margins: boolean;
}
