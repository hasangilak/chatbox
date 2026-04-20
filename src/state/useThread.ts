import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Conversation } from "../types";
import { subscribeStream } from "../api/client";
import { getConversation, postMessage } from "../api/conversations";
import {
  applyEvent,
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
  | { type: "load/success"; conversation: Conversation; thread: ThreadState }
  | { type: "load/error"; message: string }
  | { type: "event"; event: BusEvent };

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
        thread: {
          ...action.thread,
          artifactBumpKey: action.thread.artifactBumpKey,
        },
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
      return { ...state, thread: applyEvent(state.thread, action.event) };
  }
}

export function useThread(conversationId: string | null): ThreadHook {
  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    thread: initialThreadState,
    conversation: null,
    error: null,
  });
  const unsubRef = useRef<null | (() => void)>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    dispatch({ type: "load/start" });
    try {
      const detail = await getConversation(conversationId);
      dispatch({
        type: "load/success",
        conversation: detail.conversation,
        thread: {
          tree: detail.tree,
          lastEventId: null,
          lastError: null,
          artifactBumpKey: 0,
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
    void load();

    const onEvent = (event: BusEvent) => {
      if (!mounted) return;
      dispatch({ type: "event", event });
    };
    unsubRef.current = subscribeStream(conversationId, null, onEvent, (err) => {
      if (!mounted) return;
      dispatch({
        type: "load/error",
        message: err instanceof Error ? err.message : "stream disconnected",
      });
    });

    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [conversationId, load]);

  const send = useCallback(
    async (content: string, parent?: string | null) => {
      if (!conversationId) return;
      await postMessage(conversationId, {
        content,
        parent: parent ?? null,
      });
    },
    [conversationId],
  );

  return {
    status: state.status,
    state: state.thread,
    conversation: state.conversation,
    error: state.error,
    send,
    reload: load,
  };
}
