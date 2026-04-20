import type { Agent } from "../types";
import { api } from "./client";
import type {
  AgentFull,
  AgentTemplate,
  AgentVersion,
  EvalResult,
  OptimizeResponse,
  PatchAgentRequest,
  PatchAgentResponse,
} from "./wire";

export function listAgents(): Promise<Agent[]> {
  return api.get<Agent[]>("/agents");
}

export function getAgent(id: string): Promise<Agent> {
  return api.get<Agent>(`/agents/${id}`);
}

export function getAgentFull(id: string): Promise<AgentFull> {
  return api.get<AgentFull>(`/agents/${id}/full`);
}

export function createAgent(body: PatchAgentRequest): Promise<AgentFull> {
  return api.post<AgentFull>("/agents", body);
}

export function patchAgent(
  id: string,
  body: PatchAgentRequest,
): Promise<PatchAgentResponse> {
  return api.patch<PatchAgentResponse>(`/agents/${id}`, body);
}

export function deleteAgent(id: string): Promise<void> {
  return api.delete<void>(`/agents/${id}`);
}

export function listAgentVersions(id: string): Promise<AgentVersion[]> {
  return api.get<AgentVersion[]>(`/agents/${id}/versions`);
}

export function getAgentVersion(
  id: string,
  version: number,
): Promise<AgentVersion> {
  return api.get<AgentVersion>(`/agents/${id}/versions/${version}`);
}

export function restoreAgentVersion(
  id: string,
  version: number,
): Promise<{ agent: AgentFull; version: AgentVersion }> {
  return api.post<{ agent: AgentFull; version: AgentVersion }>(
    `/agents/${id}/versions/${version}/restore`,
  );
}

export function diffAgentVersions(
  id: string,
  v: number,
  against: number,
): Promise<{ a: AgentVersion; b: AgentVersion; changed_fields: string[] }> {
  return api.get(`/agents/${id}/versions/${v}/diff`, { query: { against } });
}

export function optimizeAgent(id: string): Promise<OptimizeResponse> {
  return api.post<OptimizeResponse>(`/agents/${id}/optimize`);
}

export function startEval(id: string): Promise<{
  agent_id: string;
  job_id: string;
  status: EvalResult["status"];
}> {
  return api.post(`/agents/${id}/eval/run`);
}

export function getEvalRun(id: string, jobId: string): Promise<EvalResult> {
  return api.get<EvalResult>(`/agents/${id}/eval/runs/${jobId}`);
}

export function listAgentTemplates(): Promise<AgentTemplate[]> {
  return api.get<AgentTemplate[]>("/agent-templates");
}

export function instantiateTemplate(templateId: string): Promise<AgentFull> {
  return api.post<AgentFull>(`/agents/from-template/${templateId}`);
}
