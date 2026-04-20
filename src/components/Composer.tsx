import { useState, type KeyboardEvent } from "react";
import { Icon } from "./Icon";

export interface ComposerProps {
  agentName: string;
  enabledToolCount: number;
  tokensUsed?: number;
  tokenBudget?: number;
  onSend: (content: string) => Promise<void> | void;
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
  disabled = false,
}: ComposerProps): JSX.Element {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = !disabled && !sending && draft.trim().length > 0;

  const submit = async () => {
    if (!canSend) return;
    const content = draft;
    setDraft("");
    setSending(true);
    try {
      await onSend(content);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <div className="composer-top">
          <span className="composer-chip selected">
            <Icon name="users" size={10} /> {agentName}
          </span>
          <span className="composer-chip">
            <Icon name="tool" size={10} /> {enabledToolCount} tool{enabledToolCount === 1 ? "" : "s"}
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
          placeholder={`Ask ${agentName}… ( / for commands · @ for agents · # for files )`}
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
            shift-return for newline
          </span>
          <button className="send-btn" onClick={() => void submit()} disabled={!canSend}>
            {sending ? "Sending" : "Send"} <kbd>↵</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
