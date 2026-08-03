import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Conversation, Prompt, PromptResponse } from "../types";
import { subscribeStream } from "../api/client";
import { cancelTurn, getConversation, interject, postMessage } from "../api/conversations";
import { listPrompts, promptFromRow, respondToPrompt } from "../api/prompts";
import type { RespondToPromptBody } from "../api/wire";
import {
  applyEvent,
  applyPromptResponse,
  emptyTree,
  initialThreadState,
  type ThreadState,
} from "./threadReducer";
import type { BusEvent } from "../api/events";

type Status = "idle" | "loading" | "ready" | "error";

interface ThreadHook {
  status: Status;
  state: ThreadState;
  conversation: Conversation | null;
  error: string | null;
  send: (content: string, parent?: string | null) => Promise<void>;
  /** Answer an open prompt. The stream, not this call, settles the UI. */
  respond: (promptId: string, body: RespondToPromptBody) => Promise<void>;
  /** Stop button — aborts the model call and ends the turn. */
  stop: () => Promise<void>;
  /** Steer a running turn without ending it. */
  steer: (text: string) => Promise<void>;
  reload: () => Promise<void>;
}

interface ReducerState {
  status: Status;
  thread: ThreadState;
  conversation: Conversation | null;
  error: string | null;
}

type Action =
  | { type: "load/start" }
  | {
      type: "load/success";
      conversation: Conversation;
      thread: ThreadState;
    }
  | { type: "load/error"; message: string }
  | { type: "event"; event: BusEvent }
  | { type: "prompt/settled"; promptId: string; response: PromptResponse };

function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case "load/start":
      return {
        status: "loading",
        thread: initialThreadState,
        conversation: null,
        error: null,
      };
    case "load/success":
      return {
        status: "ready",
        thread: action.thread,
        conversation: action.conversation,
        error: null,
      };
    case "load/error":
      return {
        status: "error",
        thread: initialThreadState,
        conversation: null,
        error: action.message,
      };
    case "event":
      return {
        ...state,
        thread: applyEvent(state.thread, action.event),
        conversation:
          action.event.kind === "conversation.title.updated" && state.conversation
            ? { ...state.conversation, title: action.event.title }
            : state.conversation,
      };
    case "prompt/settled":
      return {
        ...state,
        thread: applyPromptResponse(state.thread, action.promptId, action.response),
      };
  }
}

/** Reconnect backoff, in ms. Caps rather than grows without bound. */
const RETRY_DELAYS = [500, 1000, 2000, 5000, 10000];

export function useThread(conversationId: string | null): ThreadHook {
  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    thread: initialThreadState,
    conversation: null,
    error: null,
  });
  const unsubRef = useRef<null | (() => void)>(null);
  // The reducer's `lastEventId` lives behind React state, which the stream
  // callbacks can't read synchronously — this mirror is what a reconnect
  // resumes from.
  const lastEventIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    dispatch({ type: "load/start" });
    lastEventIdRef.current = null;
    try {
      // Prompts come from their own endpoint because the tree carries no prompt
      // state: `node.approval` is never written and `node.clarify` only lands
      // after the answer. Fetching all of them (not just `pending`) also lets
      // settled cards render their outcome after a reload.
      const [detail, promptRows] = await Promise.all([
        getConversation(conversationId),
        listPrompts(conversationId).catch(() => []),
      ]);
      const prompts: Record<string, Prompt> = {};
      for (const row of promptRows) prompts[row.id] = promptFromRow(row);
      dispatch({
        type: "load/success",
        conversation: detail.conversation,
        thread: {
          ...initialThreadState,
          tree: detail.tree ?? emptyTree,
          prompts,
        },
      });
    } catch (err) {
      dispatch({
        type: "load/error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [conversationId]);

  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    if (!conversationId) return;

    let mounted = true;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    void load();

    const connect = () => {
      if (!mounted) return;
      unsubRef.current = subscribeStream(
        conversationId,
        lastEventIdRef.current,
        (event) => {
          if (!mounted) return;
          attempt = 0;
          lastEventIdRef.current = event.id;
          dispatch({ type: "event", event });
        },
        () => {
          if (!mounted) return;
          // A pause can outlive the connection, so a dropped stream is a
          // reconnect, not a dead thread — resume from the cursor and the
          // server replays the tail. Failing to `load/error` here would blank a
          // conversation that is merely parked on a prompt.
          const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
          attempt += 1;
          retryTimer = setTimeout(connect, delay);
        },
      );
    };

    connect();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [conversationId, load]);

  const send = useCallback(
    async (content: string, parent?: string | null) => {
      if (!conversationId) return;
      // Pass `parent` through only when the caller named one — see postMessage.
      await postMessage(
        conversationId,
        parent === undefined ? { content } : { content, parent },
      );
    },
    [conversationId],
  );

  const respond = useCallback(async (promptId: string, body: RespondToPromptBody) => {
    const result = await respondToPrompt(promptId, body);
    // On success the `prompt.responded` event settles the card, so there is
    // nothing to do here. A 409 means another tab already won: that response
    // is the real one and its event has long since fired, so fold it in
    // directly or the card would sit on live buttons forever.
    if (result.alreadySettled && result.response) {
      dispatch({
        type: "prompt/settled",
        promptId,
        response: result.response,
      });
    }
  }, []);

  const stop = useCallback(async () => {
    if (!conversationId) return;
    await cancelTurn(conversationId);
  }, [conversationId]);

  const steer = useCallback(
    async (text: string) => {
      if (!conversationId) return;
      await interject(conversationId, text);
    },
    [conversationId],
  );

  return {
    status: state.status,
    state: state.thread,
    conversation: state.conversation,
    error: state.error,
    send,
    respond,
    stop,
    steer,
    reload: load,
  };
}
