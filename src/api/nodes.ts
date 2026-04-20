import { api } from "./client";
import type { MessageNode } from "../types";
import type { RipplePreview } from "./wire";

export function editNode(
  id: string,
  body: { content: string; ripple?: boolean },
): Promise<MessageNode> {
  return api.post<MessageNode>(`/nodes/${id}/edit`, body);
}

export function branchNode(id: string): Promise<MessageNode> {
  return api.post<MessageNode>(`/nodes/${id}/branch`);
}

export function regenerateNode(id: string): Promise<MessageNode> {
  return api.post<MessageNode>(`/nodes/${id}/regenerate`);
}

export function pruneNode(
  id: string,
  opts: { fallbackLeaf?: string } = {},
): Promise<{ ok: boolean; removed: number }> {
  return api.delete<{ ok: boolean; removed: number }>(`/nodes/${id}`, {
    query: { subtree: "true", fallback_leaf: opts.fallbackLeaf },
  });
}

export function ripplePreview(id: string): Promise<RipplePreview> {
  return api.get<RipplePreview>(`/nodes/${id}/ripple-preview`);
}
