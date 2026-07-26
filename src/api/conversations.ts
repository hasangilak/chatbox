import type { Conversation, MessageNode, MessageTree } from "../types";
import { ApiError, api } from "./client";
import type {
  CancelTurnResponse,
  ConversationDetail,
  InterjectResponse,
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

/**
 * Append a user node and start an assistant turn. Returns the user node
 * synchronously; everything after arrives on the stream.
 *
 * `parent` is omitted from the body when undefined rather than sent as `null`.
 * The server distinguishes the two: absent means "append to the active leaf",
 * while an explicit `null` means "no parent" — which roots every message and
 * leaves the conversation a pile of two-node stubs.
 */
export function postMessage(
  conversationId: string,
  body: { content: string; parent?: string | null },
): Promise<MessageNode> {
  const payload =
    body.parent === undefined
      ? { content: body.content }
      : { content: body.content, parent: body.parent };
  return api.post<MessageNode>(`/conversations/${conversationId}/messages`, payload);
}

/**
 * The stop button: abort the model call and **end** the turn.
 *
 * A `409 no turn in flight` means it is already over — reported as `null` rather
 * than thrown, since a second press on a stale button is the expected way there.
 * Works on a turn parked on an approval too, which is the only way out for a
 * user who doesn't want to decide.
 */
export async function cancelTurn(conversationId: string): Promise<CancelTurnResponse | null> {
  try {
    return await api.post<CancelTurnResponse>(`/conversations/${conversationId}/cancel`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return null;
    throw err;
  }
}

/**
 * Steer a turn that is **already running** without ending it — "actually, do it
 * this way instead". Contrast `cancelTurn`, which stops it.
 *
 * `aborted: false` is not a failure: there was no live model call to interrupt,
 * so the text is queued for the next round. `null` means no turn was in flight.
 */
export async function interject(
  conversationId: string,
  text: string,
): Promise<InterjectResponse | null> {
  try {
    return await api.post<InterjectResponse>(`/conversations/${conversationId}/interject`, {
      text,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return null;
    throw err;
  }
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
  return api.post<PinnedSnippet>(`/conversations/${conversationId}/pinned-snippets`, body);
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
