import type { MessageNode, MessageTree } from "../types";
import type { BusEvent } from "../api/events";

export interface ThreadState {
  tree: MessageTree;
  lastEventId: string | null;
  lastError: string | null;
}

export const emptyTree: MessageTree = {
  rootId: "",
  activeLeaf: "",
  nodes: {},
};

export const initialThreadState: ThreadState = {
  tree: emptyTree,
  lastEventId: null,
  lastError: null,
};

function upsertNode(tree: MessageTree, node: MessageNode): MessageTree {
  return {
    ...tree,
    nodes: { ...tree.nodes, [node.id]: node },
    rootId: tree.rootId || node.id,
  };
}

function patchNode(
  tree: MessageTree,
  id: string,
  patch: Partial<MessageNode>,
): MessageTree {
  const current = tree.nodes[id];
  if (!current) return tree;
  return {
    ...tree,
    nodes: { ...tree.nodes, [id]: { ...current, ...patch } },
  };
}

export function applyEvent(state: ThreadState, ev: BusEvent): ThreadState {
  const withEventId: Pick<ThreadState, "lastEventId"> = { lastEventId: ev.id };

  switch (ev.kind) {
    case "node.created":
    case "node.finalized":
      return {
        ...state,
        ...withEventId,
        tree: upsertNode(state.tree, {
          ...ev.node,
          streaming: ev.kind === "node.created" ? true : false,
        }),
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

    case "status.update":
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, {
          status: ev.state,
          streaming: ev.state !== "approval",
        }),
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

    case "approval.requested":
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, {
          approval: ev.approval,
          status: "approval",
        }),
      };

    case "approval.decided":
      return { ...state, ...withEventId };

    case "clarify.requested":
      return {
        ...state,
        ...withEventId,
        tree: patchNode(state.tree, ev.node_id, {
          clarify: ev.clarify,
          status: "approval",
        }),
      };

    case "clarify.answered":
      return { ...state, ...withEventId };

    case "active_leaf.changed":
      return {
        ...state,
        ...withEventId,
        tree: { ...state.tree, activeLeaf: ev.active_leaf_id },
      };

    case "artifact.updated":
      return { ...state, ...withEventId };

    case "error":
      return { ...state, ...withEventId, lastError: ev.message };
  }
}
