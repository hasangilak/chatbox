import { api } from "./client";
import type { Grant } from "./wire";

/*
 * Deciding an approval lives in `./prompts.ts` now — it is one
 * `POST /prompts/:id/respond` shared with clarifications.
 *
 * Grants kept their own routes: a grant is a standing permission keyed by
 * (agent, tool), so it outlives the turn that created it. Responding `always` to
 * an approval prompt writes one.
 */

export function listGrants(): Promise<Grant[]> {
  return api.get<Grant[]>("/approvals/grants");
}

export function revokeGrant(key: string): Promise<void> {
  return api.delete<void>(`/approvals/grants/${encodeURIComponent(key)}`);
}
