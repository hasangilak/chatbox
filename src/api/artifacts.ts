import { api } from "./client";
import type {
  Artifact,
  ArtifactDetail,
  ArtifactDiffResponse,
  ArtifactVersion,
} from "./wire";

export function listConversationArtifacts(conversationId: string): Promise<Artifact[]> {
  return api.get<Artifact[]>(`/conversations/${conversationId}/artifacts`);
}

export function getArtifact(id: string): Promise<ArtifactDetail> {
  return api.get<ArtifactDetail>(`/artifacts/${id}`);
}

export function listArtifactVersions(id: string): Promise<ArtifactVersion[]> {
  return api.get<ArtifactVersion[]>(`/artifacts/${id}/versions`);
}

export function getArtifactVersion(
  id: string,
  version: number,
): Promise<ArtifactVersion> {
  return api.get<ArtifactVersion>(`/artifacts/${id}/versions/${version}`);
}

export function diffArtifact(
  id: string,
  from: number,
  to: number,
): Promise<ArtifactDiffResponse> {
  return api.get<ArtifactDiffResponse>(`/artifacts/${id}/diff`, {
    query: { from, to },
  });
}
