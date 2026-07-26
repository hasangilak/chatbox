import { useState } from "react";
import { Icon } from "../Icon";
import { decideApproval } from "../../api/approvals";
import type { ApprovalData, ApprovalDecision as Decision } from "../../types";

export interface ApprovalCardProps {
  approval: ApprovalData;
  onDecision?: (decision: Decision) => void;
}

export function ApprovalCard({ approval, onDecision }: ApprovalCardProps): JSX.Element {
  // `confirmed` only covers the window between the HTTP response and the
  // `approval.decided` event, which have no ordering guarantee between them.
  // `approval.decision` is the durable answer: the reducer sets it from the
  // event, so it survives a reload, a reconnect, or a decision made elsewhere.
  const [confirmed, setConfirmed] = useState<Decision | null>(null);
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decision = approval.decision ?? confirmed;

  const decide = async (d: Decision) => {
    if (submitting || decision) return;
    setSubmitting(d);
    setError(null);
    try {
      // The server's answer wins over the button that was clicked — a `409`
      // means someone (or another tab) already settled this differently.
      const settled = approval.id ? (await decideApproval(approval.id, d)).decision : d;
      setConfirmed(settled);
      onDecision?.(settled);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(null);
    }
  };

  if (decision) {
    const ok = decision === "allow" || decision === "always";
    const label =
      decision === "allow"
        ? "allowed once"
        : decision === "always"
          ? "allowed · remembered"
          : "denied";
    return (
      <div className="tool">
        <div className="tool-head" style={{ cursor: "default" }}>
          <span className="tool-icon">
            <Icon name="tool" size={11} />
          </span>
          <span className="tool-name">{approval.tool}</span>
          <span className={`tool-status ${ok ? "ok" : "err"}`}>
            <span className="dot" />
            {label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="approval">
      <div className="approval-head">
        <Icon name="bolt" size={15} />
        <div className="approval-title">{approval.title}</div>
        <span className="smallcaps" style={{ marginLeft: "auto" }}>
          Permission required
        </span>
      </div>
      <div className="approval-sub">
        The assistant wants to call <code>{approval.tool}</code>. {approval.body}
      </div>
      {approval.preview && <div className="approval-args">{approval.preview}</div>}
      <div className="approval-actions">
        <button
          className="btn btn-primary"
          onClick={() => void decide("allow")}
          disabled={submitting !== null}
        >
          <Icon name="check" size={12} />
          &nbsp;{submitting === "allow" ? "Allowing…" : "Allow once"}
        </button>
        <button
          className="btn"
          onClick={() => void decide("always")}
          disabled={submitting !== null}
        >
          {submitting === "always" ? "Allowing…" : "Allow always for "}
          <code style={{ fontFamily: "JetBrains Mono", fontSize: 11 }}>{approval.tool}</code>
        </button>
        <button
          className="btn btn-danger"
          onClick={() => void decide("deny")}
          disabled={submitting !== null}
        >
          <Icon name="x" size={12} />
          &nbsp;{submitting === "deny" ? "Denying…" : "Deny"}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: 8, color: "var(--crimson)", fontSize: 11.5 }}>{error}</div>
      )}
    </div>
  );
}
