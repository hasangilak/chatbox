import { useState } from "react";
import { Icon } from "../Icon";
import type { ApprovalData } from "../../types";

type Decision = "allow" | "always" | "deny";

export interface ApprovalCardProps {
  approval: ApprovalData;
  onDecision?: (decision: Decision) => void;
}

export function ApprovalCard({ approval, onDecision }: ApprovalCardProps): JSX.Element {
  const [decision, setDecision] = useState<Decision | null>(null);

  const decide = (d: Decision) => {
    setDecision(d);
    onDecision?.(d);
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
        <button className="btn btn-primary" onClick={() => decide("allow")}>
          <Icon name="check" size={12} />
          &nbsp;Allow once
        </button>
        <button className="btn" onClick={() => decide("always")}>
          Allow always for{" "}
          <code style={{ fontFamily: "JetBrains Mono", fontSize: 11 }}>{approval.tool}</code>
        </button>
        <button className="btn btn-danger" onClick={() => decide("deny")}>
          <Icon name="x" size={12} />
          &nbsp;Deny
        </button>
      </div>
    </div>
  );
}
