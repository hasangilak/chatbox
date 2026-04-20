import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { useTools } from "../../state/useWorkspace";
import { getAgent, getAgentFull, listAgents } from "../../api/agents";
import type { Agent } from "../../types";
import type { AgentFull } from "../../api/wire";

export interface AgentPanelProps {
  agentName: string | null;
}

export function AgentPanel({ agentName }: AgentPanelProps): JSX.Element {
  const [thin, setThin] = useState<Agent | null>(null);
  const [full, setFull] = useState<AgentFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tools = useTools();

  useEffect(() => {
    if (!agentName) {
      setThin(null);
      setFull(null);
      return;
    }
    let cancelled = false;
    setError(null);
    listAgents()
      .then(async (list) => {
        if (cancelled) return;
        const match = list.find((a) => a.name === agentName) ?? null;
        setThin(match);
        if (match) {
          const [thinAgent, fullAgent] = await Promise.all([
            getAgent(match.id),
            getAgentFull(match.id),
          ]);
          if (cancelled) return;
          setThin(thinAgent);
          setFull(fullAgent);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [agentName]);

  if (!agentName) {
    return (
      <div style={{ padding: "16px 18px", color: "var(--ink-3)" }}>
        Open a conversation to inspect its agent.
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "16px 18px", color: "var(--crimson)" }}>{error}</div>
    );
  }

  if (!thin) {
    return (
      <div style={{ padding: "16px 18px", color: "var(--ink-3)" }}>Loading agent…</div>
    );
  }

  const toolList = tools.data ?? [];
  const enabledIds = full?.tool_ids ?? [];

  return (
    <div style={{ padding: "16px 18px" }}>
      <div className="field">
        <div className="field-label">
          <span>Agent</span>
          <span>{full?.current_version_id ? "versioned" : "no versions"}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            border: "1px solid var(--rule)",
            borderRadius: 3,
            background: "var(--paper-2)",
          }}
        >
          <div className="agent-dot" style={{ width: 32, height: 32, fontSize: 15 }}>
            {thin.initial}
          </div>
          <div style={{ flex: 1 }}>
            <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>
              {thin.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{thin.desc}</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}>
            <Icon name="edit" size={11} />
          </button>
        </div>
      </div>

      <div className="field">
        <div className="field-label">
          <span>Model</span>
        </div>
        <input className="input" value={full?.model ?? thin.model} readOnly />
      </div>

      <div className="field">
        <div className="field-label">
          <span>Temperature</span>
          <span className="mono">
            {(full?.temperature ?? thin.temp).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="field">
        <div className="field-label">
          <span>Tools · {enabledIds.length} enabled</span>
        </div>
        {toolList.map((t) => {
          const on = enabledIds.includes(t.id);
          return (
            <div key={t.id} className="toggle-row">
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.desc}</div>
              </div>
              <div className={`toggle ${on ? "on" : ""}`} />
            </div>
          );
        })}
      </div>

      {full && (
        <div className="field">
          <div className="field-label">
            <span>System prompt</span>
          </div>
          <textarea className="textarea prompt" value={full.system_prompt} readOnly />
        </div>
      )}
    </div>
  );
}
