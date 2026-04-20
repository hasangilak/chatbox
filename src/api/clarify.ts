import { api } from "./client";

export function answerClarify(
  clarifyId: string,
  body: { selected_chip_ids: string[]; text: string },
): Promise<{ ok: boolean }> {
  return api.post(`/clarify/${clarifyId}/answer`, body);
}
