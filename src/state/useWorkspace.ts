import { listAgents, listAgentTemplates } from "../api/agents";
import { listConversations } from "../api/conversations";
import { listTags } from "../api/tags";
import { listTools } from "../api/tools";
import { useAsync } from "./useAsync";

export function useConversations() {
  return useAsync(() => listConversations(), []);
}

export function useAgents() {
  return useAsync(() => listAgents(), []);
}

export function useAgentTemplates() {
  return useAsync(() => listAgentTemplates(), []);
}

export function useTools() {
  return useAsync(() => listTools(), []);
}

export function useTags() {
  return useAsync(() => listTags(), []);
}
