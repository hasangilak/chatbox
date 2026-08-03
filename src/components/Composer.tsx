import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import type { ToolDef } from "../types";

export interface ComposerProps {
  agentName: string;
  tools: ToolDef[];
  enabledToolIds: string[];
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
  /**
   * Rendered directly above the input. The "jump to latest" pill lives here
   * rather than being positioned against `.center` because the composer's
   * height changes with the draft — anchoring to it is the only way the pill
   * stays clear of the input without a magic offset.
   */
  jumpToLatest?: ReactNode;
}

function formatTokens(used: number | undefined, budget: number | undefined): string {
  if (used === undefined || budget === undefined) return "";
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  return `${fmt(used)} / ${fmt(budget)} tokens`;
}

export function Composer({
  agentName,
  tools,
  enabledToolIds,
  tokensUsed,
  tokenBudget,
  onSend,
  onStop,
  onSteer,
  live = false,
  disabled = false,
  jumpToLatest,
}: ComposerProps): JSX.Element {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    if (!showTools) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setShowTools(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showTools]);

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
  const toolCount = enabledToolIds.length;

  const toolLabel = (id: string, fallback: string): string => {
    const labels: Record<string, string> = {
      web_search: "Web search",
      read_file: "Read files",
      write_file: "Write files",
      run_tests: "Run tests",
      web_fetch: "Fetch web page",
      sql_query: "SQL query",
      send_email: "Send email",
    };
    return labels[id] ?? fallback;
  };

  return (
    <div className="composer-wrap">
      {jumpToLatest}
      <div className="composer">
        <div className="composer-top">
          <span className="composer-chip selected">
            <Icon name="users" size={10} /> {agentName}
          </span>
          <button
            type="button"
            className={`composer-chip ${showTools ? "open" : ""}`}
            onClick={() => setShowTools((open) => !open)}
            aria-expanded={showTools}
            aria-controls="composer-tools-panel"
          >
            <Icon name="tool" size={10} /> {toolCount} tool{toolCount === 1 ? "" : "s"}
          </button>
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
        {showTools && (
          <section
            id="composer-tools-panel"
            className="composer-tools"
            aria-label="Tools"
          >
            <div className="composer-tools-head">
              <div>
                <div className="smallcaps">Tools</div>
                <div className="composer-tools-note">
                  Search is available in every conversation. Other tools follow the selected
                  agent.
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowTools(false)}
                aria-label="Close tools"
              >
                <Icon name="x" size={12} />
              </button>
            </div>
            <div className="composer-tools-list">
              {tools.map((tool) => {
                const alwaysOn = tool.id === "web_search";
                const active = alwaysOn || enabledToolIds.includes(tool.id);
                const state = !tool.enabled
                  ? "Unavailable"
                  : alwaysOn
                    ? "Always on"
                    : active
                      ? `On for ${agentName}`
                      : "Off";
                return (
                  <div className="composer-tool-row" key={tool.id} data-active={active}>
                    <span className="composer-tool-icon">
                      <Icon name={alwaysOn ? "search" : "tool"} size={13} />
                    </span>
                    <span className="composer-tool-copy">
                      <strong>{toolLabel(tool.id, tool.name)}</strong>
                      <span>{tool.desc}</span>
                    </span>
                    <span className={`composer-tool-state ${alwaysOn ? "always" : ""}`}>
                      {state}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
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
          <button
            className="icon-btn"
            type="button"
            onClick={() => setShowTools((open) => !open)}
            aria-label="Open tools"
            aria-expanded={showTools}
          >
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
