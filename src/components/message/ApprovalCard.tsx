import { useState } from "react";
import { Icon } from "../Icon";
import type { ApprovalData, ApprovalDecision as Decision } from "../../types";
import type { RespondToPromptBody } from "../../api/wire";

export interface ApprovalCardProps {
  promptId: string;
  approval: ApprovalData;
  /** Epoch ms the pause began. A pause never expires, so cards show their age. */
  requestedAt: number;
  onRespond: (promptId: string, body: RespondToPromptBody) => Promise<void>;
}

/** Pretty-print the proposed args so they can be edited as JSON. */
function parsePreview(preview: string | undefined): string | null {
  if (!preview) return null;
  try {
    return JSON.stringify(JSON.parse(preview), null, 2);
  } catch {
    return null;
  }
}

function ageLabel(requestedAt: number, now: number): string | null {
  const mins = Math.floor((now - requestedAt) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return null;
  if (mins < 60) return `waiting ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `waiting ${hours}h`;
  return `waiting ${Math.floor(hours / 24)}d`;
}

export function ApprovalCard({
  promptId,
  approval,
  requestedAt,
  onRespond,
}: ApprovalCardProps): JSX.Element {
  const original = parsePreview(approval.preview);
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(original ?? "");
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Decided-state is not held here on purpose. The pause outlives this
  // component — and the server — so the reducer's prompt record is the only
  // thing that can tell a rebuilt card it has already been answered. Once
  // `prompt.responded` lands, the parent stops rendering this card at all.
  const decide = async (d: Decision) => {
    if (submitting) return;
    setSubmitting(d);
    setError(null);
    try {
      await onRespond(promptId, buildBody(d));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(null);
    }
  };

  /** `edited_args` only rides along when the user actually changed something. */
  const buildBody = (decision: Decision): RespondToPromptBody => {
    if (decision === "deny" || !editing || draft === original) {
      return { decision };
    }
    return { decision, edited_args: JSON.parse(draft) as Record<string, unknown> };
  };

  const draftInvalid = (() => {
    if (!editing || draft === original) return false;
    try {
      const parsed: unknown = JSON.parse(draft);
      return typeof parsed !== "object" || parsed === null || Array.isArray(parsed);
    } catch {
      return true;
    }
  })();

  const age = ageLabel(requestedAt, Date.now());
  const busy = submitting !== null;

  return (
    <div className="approval">
      <div className="approval-head">
        <Icon name="bolt" size={15} />
        <div className="approval-title">{approval.title}</div>
        <span className="smallcaps" style={{ marginLeft: "auto" }}>
          {age ?? "Permission required"}
        </span>
      </div>
      <div className="approval-sub">
        The assistant wants to call <code>{approval.tool}</code>. {approval.body}
      </div>

      {approval.preview && !editing && (
        <div className="approval-args">{original ?? approval.preview}</div>
      )}
      {editing && (
        <>
          <textarea
            className="approval-args approval-args-edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            disabled={busy}
          />
          {draftInvalid && (
            <div className="approval-note err">
              Arguments must be a JSON object. Fix or revert before allowing.
            </div>
          )}
        </>
      )}

      {original && (
        <div className="approval-note">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (editing) setDraft(original);
              setEditing(!editing);
            }}
            disabled={busy}
          >
            <Icon name="edit" size={11} />
            &nbsp;{editing ? "Discard edits" : "Edit arguments"}
          </button>
          {editing && (
            <span>
              The tool will run with what you write here. The sandbox still applies — an edited path
              escapes nothing.
            </span>
          )}
        </div>
      )}

      <div className="approval-actions">
        <button
          className="btn btn-primary"
          onClick={() => void decide("allow")}
          disabled={busy || draftInvalid}
        >
          <Icon name="check" size={12} />
          &nbsp;{submitting === "allow" ? "Allowing…" : "Allow once"}
        </button>
        <button
          className="btn"
          onClick={() => void decide("always")}
          disabled={busy || draftInvalid}
        >
          {submitting === "always" ? "Allowing…" : "Allow always for "}
          <code style={{ fontFamily: "JetBrains Mono", fontSize: 11 }}>{approval.tool}</code>
        </button>
        <button className="btn btn-danger" onClick={() => void decide("deny")} disabled={busy}>
          <Icon name="x" size={12} />
          &nbsp;{submitting === "deny" ? "Denying…" : "Deny"}
        </button>
      </div>
      {error && <div className="approval-note err">{error}</div>}
    </div>
  );
}
