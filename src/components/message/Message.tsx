import { useState } from "react";
import { Icon } from "../Icon";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCall } from "./ToolCall";
import { ApprovalCard } from "./ApprovalCard";
import { Clarify } from "./Clarify";
import { StatusLine } from "./StatusLine";
import type { MessageNode } from "../../types";

export interface MessageProps {
  node: MessageNode;
  index: number;
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

export function Message({ node, index, onEdit, onBranch }: MessageProps): JSX.Element {
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(node.content);
  const [ripple, setRipple] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const isUser = node.role === "user";
  const numLabel = String(index).padStart(2, "0");

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
            <button
              className="btn btn-ghost"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
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
          {node.content.split("\n\n").map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(p) }} />
          ))}
        </div>

        {node.toolCall && <ToolCall tool={node.toolCall} />}
        {node.clarify && <Clarify data={node.clarify} />}
        {node.approval && <ApprovalCard approval={node.approval} />}
        {node.streaming && <StatusLine state="streaming" elapsed="2.1s" />}
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
