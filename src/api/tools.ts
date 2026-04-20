import type { ToolDef } from "../types";
import { api } from "./client";

export function listTools(): Promise<ToolDef[]> {
  return api.get<ToolDef[]>("/tools");
}
