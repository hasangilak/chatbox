import { useState, type KeyboardEvent } from "react";
import { Icon } from "./Icon";

export interface ComposerProps {
  agentName: string;
  enabledToolCount: number;
  tokensUsed?: number;
  tokenBudget?: number;
  onSend: (content: string) => Promise<void> | void;
  /** Stop button — ends the turn. Absent means no stop affordance. */
  onStop?: () => Promise<void> | void;
  /** Steer the running turn with the draft text, without ending it. */
  onSteer?: (text: string) => Promise<void> | void;
  /** True while an assistant turn is in flight. */
  live?: boolean;
  disabled?: boolean;
}

function formatTokens(used: number | undefined, budget: number | undefined): string {
  if (used === undefined || budget === undefined) return "";
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  return `${fmt(used)} / ${fmt(budget)} tokens`;
}

export function Composer({
  agentName,
  enabledToolCount,
  tokensUsed,
  tokenBudget,
  onSend,
  onStop,
  onSteer,
  live = false,
  disabled = false,
}: ComposerProps): JSX.Element {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);

  const hasDraft = draft.trim().length > 0;
  // While a turn is live the primary action steers it instead of queueing a new
  // message — `interject` keeps the turn alive and redirects it, which is the
  // verb that matches "actually, do it this way instead".
  const steerFn = live ? onSteer : undefined;
  const steering = steerFn !== undefined;
  const canSubmit = !disabled && !busy && hasDraft;

  const submit = async () => {
    if (!canSubmit) return;
    const content = draft;
    setDraft("");
    setBusy(true);
    try {
      if (steerFn) await steerFn(content);
      else await onSend(content);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!onStop || stopping) return;
    setStopping(true);
    try {
      await onStop();
    } finally {
      setStopping(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const submitLabel = steering ? (busy ? "Steering" : "Steer") : busy ? "Sending" : "Send";

  return (
    <div className="composer-wrap">
      <div className="composer">
        <div className="composer-top">
          <span className="composer-chip selected">
            <Icon name="users" size={10} /> {agentName}
          </span>
          <span className="composer-chip">
            <Icon name="tool" size={10} /> {enabledToolCount} tool
            {enabledToolCount === 1 ? "" : "s"}
          </span>
          <span className="composer-chip">
            <Icon name="attach" size={10} /> context
          </span>
          <span className="composer-chip">
            <Icon name="brain" size={10} /> reasoning · high
          </span>
          <span style={{ flex: 1 }} />
          <span className="smallcaps" style={{ color: "var(--ink-4)" }}>
            {formatTokens(tokensUsed, tokenBudget)}
          </span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={
            steering
              ? `Redirect ${agentName} mid-answer…`
              : `Ask ${agentName}… ( / for commands · @ for agents · # for files )`
          }
          disabled={disabled}
        />
        <div className="composer-foot">
          <button className="icon-btn">
            <Icon name="attach" size={13} />
          </button>
          <button className="icon-btn">
            <Icon name="tool" size={13} />
          </button>
          <button className="icon-btn">
            <Icon name="brain" size={13} />
          </button>
          <div className="spacer" />
          <span className="smallcaps" style={{ color: "var(--ink-4)" }}>
            {steering ? "steering keeps the turn alive" : "shift-return for newline"}
          </span>
          {live && onStop && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => void stop()}
              disabled={stopping}
              title="Stop the assistant and end the turn"
            >
              <Icon name="stop" size={11} />
              &nbsp;{stopping ? "Stopping…" : "Stop"}
            </button>
          )}
          <button className="send-btn" onClick={() => void submit()} disabled={!canSubmit}>
            {submitLabel} <kbd>↵</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
