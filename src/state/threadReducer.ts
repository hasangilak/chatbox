import type {
  Cancellation,
  Interjection,
  MessageNode,
  MessageTree,
  Prompt,
  PromptRequest,
  PromptResponse,
} from "../types";
import type { BusEvent } from "../api/events";

export interface ThreadError {
  message: string;
  recoverable: boolean;
  /**
   * Boot recovery's terminal message for a turn with no usable checkpoint. Not a
   * model failure, so the right affordance is "regenerate", not "retry".
   */
  interruptedByRestart: boolean;
}

export interface ThreadState {
  tree: MessageTree;
  /**
   * Every prompt this conversation has raised, keyed by `prompt_id` — open ones
   * carry `response: null`. Keyed by id rather than hung off the node because
   * several can be open at once and answered in any order.
   */
  prompts: Record<string, Prompt>;
  /** Mid-turn steering, keyed by the node it landed on, in arrival order. */
  interjections: Record<string, Interjection[]>;
  /** Nodes the user stopped. Renders as "stopped", not "complete". */
  cancelled: Record<string, Cancellation>;
  lastEventId: string | null;
  lastError: ThreadError | null;
  artifactBumpKey: number;
}

export const emptyTree: MessageTree = {
  rootId: "",
  activeLeaf: "",
  nodes: {},
};

export const initialThreadState: ThreadState = {
  tree: emptyTree,
  prompts: {},
  interjections: {},
  cancelled: {},
  lastEventId: null,
  lastError: null,
  artifactBumpKey: 0,
};

const RESTART_INTERRUPT = "turn was interrupted by a server restart and cannot be resumed";

function upsertNode(tree: MessageTree, node: MessageNode): MessageTree {
  return {
    ...tree,
    nodes: { ...tree.nodes, [node.id]: node },
    rootId: tree.rootId || node.id,
  };
}

function patchNode(tree: MessageTree, id: string, patch: Partial<MessageNode>): MessageTree {
  const current = tree.nodes[id];
  if (!current) return tree;
  return {
    ...tree,
    nodes: { ...tree.nodes, [id]: { ...current, ...patch } },
  };
}

/** A prompt still awaiting an answer. Its request is always known. */
export type OpenPrompt = Prompt & { request: PromptRequest };

/** Open prompts for a node, oldest first. */
export function openPromptsForNode(state: ThreadState, nodeId: string): OpenPrompt[] {
  return promptsForNode(state, nodeId).filter(
    (p): p is OpenPrompt => !p.cancelled && p.response === null && p.request !== null,
  );
}

/** Every prompt raised on a node, answered or not, oldest first. */
export function promptsForNode(state: ThreadState, nodeId: string): Prompt[] {
  return Object.values(state.prompts)
    .filter((p) => p.node_id === nodeId)
    .sort((a, b) => a.requested_at - b.requested_at);
}

/** True while the conversation is parked waiting on a human. */
export function hasOpenPrompt(state: ThreadState): boolean {
  return Object.values(state.prompts).some((p) => !p.cancelled && p.response === null);
}

/**
 * Settle a prompt from a source that is not the event stream — the response
 * carried by a `409 already responded`.
 *
 * Deliberately not routed through `applyEvent`: a synthesized event would
 * overwrite `lastEventId` with an id the server has never issued, and a
 * reconnect would then replay the conversation from the beginning.
 */
export function applyPromptResponse(
  state: ThreadState,
  promptId: string,
  response: PromptResponse,
): ThreadState {
  const existing = state.prompts[promptId];
  if (!existing) return state;
  return {
    ...state,
    prompts: { ...state.prompts, [promptId]: { ...existing, response } },
  };
}

export function applyEvent(state: ThreadState, ev: BusEvent): ThreadState {
  const withEventId: Pick<ThreadState, "lastEventId"> = { lastEventId: ev.id };

  switch (ev.kind) {
    // On create the server's own `streaming` is authoritative — it is true for a
    // new assistant node and absent for a user node, and forcing it true here
    // left every user message wearing a spinner that nothing ever cleared.
    // Finalization is definitional, so that one is set rather than trusted.
    case "node.created":
      return {
        ...state,
        ...withEventId,
        tree: upsertNode(state.tree, ev.node),
      };

    case "node.finalized":
      return {
        ...state,
        ...withEventId,
        tree: upsertNode(state.tree, { ...ev.node, streaming: false }),
      };

    case "content.delta": {
      const current = state.tree.nodes[ev.node_id];
      if (!current) return { ...state, ...withEventId };
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, {
          content: (current.content ?? "") + ev.delta,
        }),
      };
    }

    case "reasoning.delta": {
      const current = state.tree.nodes[ev.node_id];
      if (!current) return { ...state, ...withEventId };
      const reasoning = (current.reasoning ?? []).slice();
      reasoning[ev.step_index] = (reasoning[ev.step_index] ?? "") + ev.delta;
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, { reasoning }),
      };
    }

    case "reasoning.step.end": {
      const current = state.tree.nodes[ev.node_id];
      if (!current) return { ...state, ...withEventId };
      const reasoning = (current.reasoning ?? []).slice();
      reasoning[ev.step_index] = ev.final_text;
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, { reasoning }),
      };
    }

    // `streaming` is deliberately left alone. It means "this turn is still
    // alive", which a pause does not end — the server keeps it true on a parked
    // node, and matching that is what lets a reload tell an answerable prompt
    // from one left over on a turn that has already stopped. What to *show*
    // while parked is `status`'s job, and StatusLine already reads it.
    case "status.update":
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, { status: ev.state }),
      };

    case "toolcall.proposed":
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, { toolCall: ev.tool_call }),
      };

    case "toolcall.started": {
      const current = state.tree.nodes[ev.node_id];
      if (!current) return { ...state, ...withEventId };
      // `args` here are the edited ones if the user rewrote them, so this
      // overwrite is what keeps history honest about what actually ran.
      const next = current.toolCall
        ? { ...current.toolCall, name: ev.tool, args: ev.args }
        : { name: ev.tool, args: ev.args, status: "pending" as const };
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, { toolCall: next }),
      };
    }

    case "toolcall.ended": {
      const current = state.tree.nodes[ev.node_id];
      if (!current?.toolCall) return { ...state, ...withEventId };
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, {
          toolCall: {
            ...current.toolCall,
            status: ev.status,
            elapsed: `${(ev.elapsed_ms / 1000).toFixed(1)}s`,
            ...(ev.result !== undefined ? { result: ev.result } : {}),
          },
        }),
      };
    }

    case "prompt.requested": {
      const prompt: Prompt = {
        id: ev.prompt_id,
        node_id: ev.node_id,
        tool: ev.tool,
        request: ev.request,
        // A replay can deliver the request after the response. Don't let it
        // reopen a prompt that a later `prompt.responded` already settled.
        response: state.prompts[ev.prompt_id]?.response ?? null,
        cancelled: state.prompts[ev.prompt_id]?.cancelled ?? false,
        requested_at: ev.at,
      };
      return {
        ...state,
        ...withEventId,
        prompts: { ...state.prompts, [ev.prompt_id]: prompt },
        tree: patchNode(state.tree, ev.node_id, { status: "approval" }),
      };
    }

    // Emphatically not a no-op. A pause is a durable checkpoint, so a response
    // can arrive long after the click — from another tab, or on replay after a
    // reconnect. Recording it here is what stops a card rebuilt from the request
    // event from offering live buttons over an already-settled prompt.
    case "prompt.responded": {
      const existing = state.prompts[ev.prompt_id];
      const prompt: Prompt = existing
        ? { ...existing, response: ev.response }
        : {
            id: ev.prompt_id,
            node_id: ev.node_id,
            tool: ev.tool,
            // A replay cursor can start past the request. Recording the response
            // with no request still settles the prompt, which is the point.
            request: null,
            response: ev.response,
            cancelled: false,
            requested_at: ev.at,
          };
      return {
        ...state,
        ...withEventId,
        prompts: { ...state.prompts, [ev.prompt_id]: prompt },
      };
    }

    case "interjection.received": {
      const prior = state.interjections[ev.node_id] ?? [];
      if (prior.some((i) => i.id === ev.interjection_id)) {
        return { ...state, ...withEventId };
      }
      return {
        ...state,
        ...withEventId,
        interjections: {
          ...state.interjections,
          [ev.node_id]: [
            ...prior,
            {
              id: ev.interjection_id,
              text: ev.text,
              aborted: ev.aborted,
              at: ev.at,
            },
          ],
        },
      };
    }

    // Always arrives before `node.finalized`, in both the generating and the
    // parked case, so the finalize can be labelled without knowing which.
    case "turn.cancelled":
      return {
        ...state,
        ...withEventId,
        cancelled: {
          ...state.cancelled,
          [ev.node_id]: { aborted: ev.aborted, at: ev.at },
        },
      };

    case "active_leaf.changed":
      return {
        ...state,
        ...withEventId,
        tree: { ...state.tree, activeLeaf: ev.active_leaf_id },
      };

    case "artifact.updated":
      return {
        ...state,
        ...withEventId,
        artifactBumpKey: state.artifactBumpKey + 1,
      };

    // Conversation metadata lives beside ThreadState in useThread. Advancing
    // the cursor here still matters so reconnect starts after this event.
    case "conversation.title.updated":
      return { ...state, ...withEventId };

    case "error":
      return {
        ...state,
        ...withEventId,
        lastError: {
          message: ev.message,
          recoverable: ev.recoverable,
          interruptedByRestart: ev.message === RESTART_INTERRUPT,
        },
      };
  }
}
