import { api } from "./client";
import type { ApprovalDecision, Grant } from "./wire";

export function decideApproval(
  approvalId: string,
  decision: ApprovalDecision,
): Promise<{ ok: boolean; decision: ApprovalDecision }> {
  return api.post(`/approvals/${approvalId}/decide`, { decision });
}

export function listGrants(): Promise<Grant[]> {
  return api.get<Grant[]>("/approvals/grants");
}

export function revokeGrant(key: string): Promise<void> {
  return api.delete<void>(`/approvals/grants/${encodeURIComponent(key)}`);
}
