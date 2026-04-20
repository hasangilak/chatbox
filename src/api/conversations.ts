import type { Conversation, MessageNode, MessageTree } from "../types";
import { api } from "./client";
import type {
  ConversationDetail,
  PinnedSnippet,
  ShareResponse,
  ThreadNote,
  TimelineEvent,
} from "./wire";

export function listConversations(params?: {
  tag?: string;
  q?: string;
  folder?: string;
  pinned?: boolean;
}): Promise<Conversation[]> {
  return api.get<Conversation[]>("/conversations", { query: params });
}

export function getConversation(id: string): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/conversations/${id}`);
}

export function getConversationTree(id: string): Promise<MessageTree> {
  return api.get<MessageTree>(`/conversations/${id}/tree`);
}

export function createConversation(body: {
  agent?: string;
  title?: string;
}): Promise<Conversation> {
  return api.post<Conversation>("/conversations", body);
}

export function postMessage(
  conversationId: string,
  body: { content: string; parent?: string | null },
): Promise<MessageNode> {
  return api.post<MessageNode>(`/conversations/${conversationId}/messages`, body);
}

export function getTimeline(conversationId: string): Promise<TimelineEvent[]> {
  return api.get<TimelineEvent[]>(`/conversations/${conversationId}/timeline`);
}

export function getNote(conversationId: string): Promise<ThreadNote> {
  return api.get<ThreadNote>(`/conversations/${conversationId}/notes`);
}

export function putNote(conversationId: string, body: string): Promise<ThreadNote> {
  return api.put<ThreadNote>(`/conversations/${conversationId}/notes`, { body });
}

export function listPinnedSnippets(conversationId: string): Promise<PinnedSnippet[]> {
  return api.get<PinnedSnippet[]>(`/conversations/${conversationId}/pinned-snippets`);
}

export function createPinnedSnippet(
  conversationId: string,
  body: { source_node_id: string; label: string; excerpt: string },
): Promise<PinnedSnippet> {
  return api.post<PinnedSnippet>(
    `/conversations/${conversationId}/pinned-snippets`,
    body,
  );
}

export function deletePinnedSnippet(id: string): Promise<void> {
  return api.delete<void>(`/pinned-snippets/${id}`);
}

export function attachTag(
  conversationId: string,
  body: { tag_id?: string; name?: string },
): Promise<unknown> {
  return api.post(`/conversations/${conversationId}/tags`, body);
}

export function detachTag(conversationId: string, tagId: string): Promise<void> {
  return api.delete<void>(`/conversations/${conversationId}/tags/${tagId}`);
}

export function shareConversation(conversationId: string): Promise<ShareResponse> {
  return api.post<ShareResponse>(`/conversations/${conversationId}/share`);
}

export function revokeShare(conversationId: string): Promise<void> {
  return api.delete<void>(`/conversations/${conversationId}/share`);
}

export function exportUrl(conversationId: string, format: "md" | "json"): string {
  return `/conversations/${conversationId}/export?format=${format}`;
}
