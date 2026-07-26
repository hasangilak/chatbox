import type {
  MessageNode,
  PromptRequest,
  PromptResponse,
  StatusState,
  ToolCallData,
  ToolStatus,
} from "../types";

export interface BaseEvent {
  id: string;
  at: number;
  conversation_id: string;
}

export interface NodeCreatedEvent extends BaseEvent {
  kind: "node.created";
  node: MessageNode;
}

export interface StatusUpdateEvent extends BaseEvent {
  kind: "status.update";
  node_id: string;
  state: StatusState;
  elapsed_ms: number;
  tool?: string;
}

export interface ContentDeltaEvent extends BaseEvent {
  kind: "content.delta";
  node_id: string;
  delta: string;
}

export interface ReasoningDeltaEvent extends BaseEvent {
  kind: "reasoning.delta";
  node_id: string;
  step_index: number;
  delta: string;
}

export interface ReasoningStepEndEvent extends BaseEvent {
  kind: "reasoning.step.end";
  node_id: string;
  step_index: number;
  final_text: string;
}

export interface ToolCallProposedEvent extends BaseEvent {
  kind: "toolcall.proposed";
  node_id: string;
  tool_call: ToolCallData;
}

export interface ToolCallStartedEvent extends BaseEvent {
  kind: "toolcall.started";
  node_id: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolCallEndedEvent extends BaseEvent {
  kind: "toolcall.ended";
  node_id: string;
  status: Exclude<ToolStatus, "pending">;
  elapsed_ms: number;
  result?: string;
  error?: string;
}

export interface PromptRequestedEvent extends BaseEvent {
  kind: "prompt.requested";
  node_id: string;
  /** POST this id back to `/prompts/:id/respond`. */
  prompt_id: string;
  /** `ask_clarification` for clarify prompts. */
  tool: string;
  request: PromptRequest;
}

export interface PromptRespondedEvent extends BaseEvent {
  kind: "prompt.responded";
  node_id: string;
  prompt_id: string;
  tool: string;
  response: PromptResponse;
}

export interface InterjectionReceivedEvent extends BaseEvent {
  kind: "interjection.received";
  node_id: string;
  interjection_id: string;
  text: string;
  /** true = a live model call was cut off; false = queued for the next round. */
  aborted: boolean;
}

export interface TurnCancelledEvent extends BaseEvent {
  kind: "turn.cancelled";
  node_id: string;
  /** true = a live model call was cut off. */
  aborted: boolean;
  /** true = the cancel endpoint closed the node itself (the turn was parked). */
  finalized: boolean;
}

export interface ArtifactUpdatedEvent extends BaseEvent {
  kind: "artifact.updated";
  artifact_id: string;
  version_id: string;
  version: number;
  title: string;
}

export interface NodeFinalizedEvent extends BaseEvent {
  kind: "node.finalized";
  node_id: string;
  node: MessageNode;
}

export interface ActiveLeafChangedEvent extends BaseEvent {
  kind: "active_leaf.changed";
  active_leaf_id: string;
}

export interface ErrorEvent extends BaseEvent {
  kind: "error";
  node_id?: string;
  message: string;
  recoverable: boolean;
}

export type BusEvent =
  | NodeCreatedEvent
  | StatusUpdateEvent
  | ContentDeltaEvent
  | ReasoningDeltaEvent
  | ReasoningStepEndEvent
  | ToolCallProposedEvent
  | ToolCallStartedEvent
  | ToolCallEndedEvent
  | PromptRequestedEvent
  | PromptRespondedEvent
  | InterjectionReceivedEvent
  | TurnCancelledEvent
  | ArtifactUpdatedEvent
  | NodeFinalizedEvent
  | ActiveLeafChangedEvent
  | ErrorEvent;

export type BusEventKind = BusEvent["kind"];
