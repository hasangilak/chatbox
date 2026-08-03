import { useState } from "react";
import { Icon } from "../Icon";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCall } from "./ToolCall";
import { PromptCard } from "./PromptCard";
import { StatusLine } from "./StatusLine";
import type { Cancellation, Interjection, MessageNode, Prompt } from "../../types";
import type { RespondToPromptBody } from "../../api/wire";

export interface MessageProps {
  node: MessageNode;
  index: number;
  /** Every prompt this node raised, oldest first — open ones render live. */
  prompts?: Prompt[];
  /** Mid-turn steering that landed on this node. */
  interjections?: Interjection[];
  /** Set when the user stopped this turn; it reads as "stopped", not "complete". */
  cancellation?: Cancellation;
  onRespond?: (promptId: string, body: RespondToPromptBody) => Promise<void>;
  onEdit?: (draft: string, opts: { ripple: boolean }) => Promise<void> | void;
  onBranch?: () => void;
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const MARGIN_NOTES: Record<number, string> = {
  1: "Diagnose before prescribing. Asks one clarifier; peeks at source.",
  3: "Three moving parts: classification, full-jitter, retry budget. Requests write permission.",
  5: "Wrote 3 files; 1.1s. Offers to run tests next.",
};

export function Message({
  node,
  index,
  prompts = [],
  interjections = [],
  cancellation,
  onRespond,
  onEdit,
  onBranch,
}: MessageProps): JSX.Element {
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(node.content);
  const [ripple, setRipple] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const isUser = node.role === "user";
  const numLabel = String(index).padStart(2, "0");
  // A prompt left open on a turn that is no longer running can never be
  // resumed, so the card stops asking. Derived from the node rather than from
  // `turn.cancelled` alone, because that event is stream-only and a reload
  // must reach the same conclusion.
  const promptsAreMoot = cancellation !== undefined || node.streaming !== true;
  const visibleContent =
    node.toolCall?.name === "web_search" &&
    (/web_search\s*\(/.test(node.content) || /"name"\s*:\s*"web_search"/.test(node.content))
      ? ""
      : node.content;

  const save = async () => {
    if (!onEdit) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(draft, { ripple });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="msg">
        <div className="msg-num">{numLabel}</div>
        <div className="msg-body">
          <div className="msg-head">
            <span className={`msg-author ${isUser ? "user" : "asst"} serif`}>
              {isUser ? "You" : "Assistant"}
            </span>
            <span className="smallcaps" style={{ color: "var(--ochre-ink)" }}>
              Editing · will create a branch
            </span>
          </div>
          <textarea
            className="inline-edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="inline-edit-foot">
            <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>
              <Icon name="branch" size={11} />
              &nbsp;{saving ? "Saving…" : "Save & branch"}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <label
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                fontSize: 11,
                color: "var(--ink-3)",
              }}
            >
              <input
                type="checkbox"
                checked={ripple}
                onChange={(e) => setRipple(e.target.checked)}
                disabled={saving}
              />
              ripple to children
            </label>
          </div>
        </div>
        <div className="msg-gutter" />
      </div>
    );
  }

  return (
    <div className="msg">
      <div className="msg-num">{numLabel}</div>
      <div className="msg-body">
        <div className="msg-head">
          <span className={`msg-author ${isUser ? "user" : "asst"} serif`}>
            {isUser ? "You" : "Assistant"}
          </span>
          <span className="msg-time mono">{node.time}</span>
          {node.branch && node.branch !== "main" && (
            <span className="msg-branch">
              <Icon name="branch" size={10} /> {node.branch}
            </span>
          )}
          <span
            className="msg-branch"
            onClick={onBranch}
            style={{ marginLeft: node.branch && node.branch !== "main" ? 6 : "auto" }}
          >
            2 branches <span className="chev">▾</span>
          </span>
        </div>

        {node.reasoning && <ReasoningBlock steps={node.reasoning} defaultOpen={index === 2} />}

        <div className="msg-content">
          {visibleContent.split("\n\n").map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(p) }} />
          ))}
        </div>

        {interjections.map((i) => (
          <div key={i.id} className="interjection">
            <Icon name="wand" size={11} />
            <span className="interjection-label">
              You steered{i.aborted ? " mid-sentence" : " — queued for the next round"}
            </span>
            <span className="interjection-text">“{i.text}”</span>
          </div>
        ))}

        {node.toolCall && <ToolCall tool={node.toolCall} />}

        {onRespond &&
          prompts.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              moot={promptsAreMoot}
              onRespond={onRespond}
            />
          ))}

        {cancellation && (
          <div className="turn-stopped">
            <Icon name="x" size={11} />
            <span>
              Stopped
              {cancellation.aborted ? " — the reply ends mid-sentence" : ""}
            </span>
          </div>
        )}

        {node.streaming && !cancellation && (
          <StatusLine state={node.status ?? "streaming"} tool={node.toolCall?.name} />
        )}
      </div>
      <div className="msg-gutter">
        <button
          className="row-btn"
          onClick={() => isUser && setEditing(true)}
          title={isUser ? "Edit (creates branch)" : "Edit response"}
        >
          <Icon name="edit" size={12} />
        </button>
        <button className="row-btn" title="Copy">
          <Icon name="copy" size={12} />
        </button>
        <button className="row-btn" onClick={onBranch} title="Branch from here">
          <Icon name="branch" size={12} />
        </button>
        <button className="row-btn" title="More">
          <Icon name="dots" size={12} />
        </button>
      </div>
      <div className="msg-margin">{MARGIN_NOTES[index]}</div>
    </div>
  );
}
