import { ApiError, api } from "./client";
import type {
  Prompt,
  PromptResponse,
  PromptRow,
  RespondToPromptBody,
  RespondToPromptResponse,
} from "./wire";

export interface RespondResult {
  /** The response the server holds — not necessarily the one just submitted. */
  response: PromptResponse | null;
  /** `false` means there was no paused turn to continue; still recorded. */
  resumed: boolean;
  /** `true` when the turn had already been stopped, so it stays ended. */
  cancelled: boolean;
  /** `true` when the server had already settled this before this call. */
  alreadySettled: boolean;
}

/**
 * Answer a prompt and resume the paused turn.
 *
 * Two non-failures to know about. A `409 already responded` carries the winning
 * response, so it is reported as settled rather than thrown — another tab, or a
 * second click on a card rebuilt after a reload, is the expected way to hit it.
 * And `resumed: false` just means nothing was parked; the answer is recorded
 * either way.
 *
 * The `prompt.responded` event arrives separately as the graph resumes, with no
 * ordering guarantee against this call. Treat a 200 as "recorded" and let the
 * stream drive the UI.
 */
export async function respondToPrompt(
  promptId: string,
  body: RespondToPromptBody,
): Promise<RespondResult> {
  try {
    const res = await api.post<RespondToPromptResponse>(`/prompts/${promptId}/respond`, body);
    return {
      response: null,
      resumed: res.resumed ?? false,
      cancelled: res.cancelled ?? false,
      alreadySettled: false,
    };
  } catch (err) {
    const settled = settledResponse(err);
    if (settled) {
      return {
        response: settled,
        resumed: false,
        cancelled: false,
        alreadySettled: true,
      };
    }
    throw err;
  }
}

/** The response carried by a `409 already responded` body, if it is readable. */
function settledResponse(err: unknown): PromptResponse | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  if (typeof err.body !== "object" || err.body === null) return null;
  const raw = (err.body as { response?: unknown }).response;
  if (typeof raw !== "object" || raw === null) return null;
  const kind = (raw as { prompt_kind?: unknown }).prompt_kind;
  return kind === "approval" || kind === "clarify" ? (raw as PromptResponse) : null;
}

export function getPrompt(promptId: string): Promise<PromptRow> {
  return api.get<PromptRow>(`/prompts/${promptId}`);
}

/**
 * Every prompt for a conversation, newest first — or only the open ones with
 * `{ pending: true }`.
 *
 * This is the reconnect path: neither `node.approval` (never written) nor
 * `node.clarify` (written only after the answer) tells you a prompt is open, so
 * one request here replaces replaying the event log.
 */
export function listPrompts(
  conversationId: string,
  opts: { pending?: boolean } = {},
): Promise<PromptRow[]> {
  return api.get<PromptRow[]>(`/conversations/${conversationId}/prompts`, {
    query: { pending: opts.pending ? "true" : undefined },
  });
}

/** Normalize a fetched row into the shape the reducer keeps. */
export function promptFromRow(row: PromptRow): Prompt {
  return {
    id: row.id,
    node_id: row.node_id,
    tool: row.tool,
    request: row.request,
    response: row.response,
    cancelled: row.cancelled_at !== null,
    requested_at: Date.parse(row.created_at),
  };
}
