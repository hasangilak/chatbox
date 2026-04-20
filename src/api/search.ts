import { api } from "./client";
import type { SearchResponse, SearchScope } from "./wire";

export function search(q: string, scope: SearchScope = "all"): Promise<SearchResponse> {
  return api.get<SearchResponse>("/search", { query: { q, scope } });
}
