import { api } from "./client";
import type { Tag } from "./wire";

export function listTags(): Promise<Tag[]> {
  return api.get<Tag[]>("/tags");
}

export function createTag(body: { name: string; color?: string }): Promise<Tag> {
  return api.post<Tag>("/tags", body);
}

export function patchTag(
  id: string,
  body: { name?: string; color?: string },
): Promise<Tag> {
  return api.patch<Tag>(`/tags/${id}`, body);
}

export function deleteTag(id: string): Promise<void> {
  return api.delete<void>(`/tags/${id}`);
}
