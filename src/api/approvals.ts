import { ApiError, api } from "./client";
import type { ApprovalDecision, Grant } from "./wire";

interface DecideApprovalResponse {
  ok: boolean;
  decision: ApprovalDecision;
  resumed?: boolean;
}

export interface DecideApprovalResult {
  /** The outcome the server holds — not necessarily the one just clicked. */
  decision: ApprovalDecision;
  /** `false` means there was no paused turn to continue; still recorded. */
  resumed: boolean;
  /** `true` when the server had already settled this before this call. */
  alreadySettled: boolean;
}

/**
 * Record a decision and resume the paused turn.
 *
 * A `409 already decided` carries the real outcome, so it is reported as a
 * settled result rather than an error — the approval genuinely is decided,
 * and a second click on a stale card is the expected way to hit this.
 */
export async function decideApproval(
  approvalId: string,
  decision: ApprovalDecision,
): Promise<DecideApprovalResult> {
  try {
    const res = await api.post<DecideApprovalResponse>(
      `/approvals/${approvalId}/decide`,
      { decision },
    );
    return {
      decision: res.decision ?? decision,
      resumed: res.resumed ?? false,
      alreadySettled: false,
    };
  } catch (err) {
    const settled = settledDecision(err);
    if (settled) {
      return { decision: settled, resumed: false, alreadySettled: true };
    }
    throw err;
  }
}

/** The decision carried by a `409 already decided` body, if it is readable. */
function settledDecision(err: unknown): ApprovalDecision | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const raw =
    typeof err.body === "object" && err.body !== null && "decision" in err.body
      ? (err.body as { decision: unknown }).decision
      : null;
  return raw === "allow" || raw === "always" || raw === "deny" ? raw : null;
}

export function listGrants(): Promise<Grant[]> {
  return api.get<Grant[]>("/approvals/grants");
}

export function revokeGrant(key: string): Promise<void> {
  return api.delete<void>(`/approvals/grants/${encodeURIComponent(key)}`);
}
