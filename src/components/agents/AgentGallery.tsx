import { Icon } from "../Icon";
import { useAgentTemplates } from "../../state/useWorkspace";
import { instantiateTemplate } from "../../api/agents";
import type { Agent } from "../../types";
import type { AgentFull } from "../../api/wire";

export interface AgentGalleryProps {
  agents: Agent[];
  onClose: () => void;
  onOpenBuilder: (agent: Agent | AgentFull | null) => void;
}

export function AgentGallery({
  agents,
  onClose,
  onOpenBuilder,
}: AgentGalleryProps): JSX.Element {
  const templates = useAgentTemplates();

  const instantiate = async (templateId: string) => {
    try {
      const full = await instantiateTemplate(templateId);
      onOpenBuilder(full);
    } catch (err) {
      console.error("instantiate template failed", err);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <Icon name="users" size={18} />
          <div className="title">Agents</div>
          <div className="smallcaps">your library · {agents.length}</div>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="modal-body">
          <div className="agent-grid">
            <div
              className="agent-card"
              onClick={() => onOpenBuilder(null)}
              style={{
                background: "var(--paper-2)",
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, color: "var(--ink-3)" }}>
                <Icon name="plus" size={20} />
              </div>
              <div className="an" style={{ fontSize: 14 }}>
                New agent
              </div>
              <div className="ad" style={{ flex: "none" }}>
                Start from a blank slate or a template.
              </div>
            </div>
            {agents.map((a) => (
              <div key={a.id} className="agent-card" onClick={() => onOpenBuilder(a)}>
                <div className="mark">{a.initial}</div>
                <div className="an">{a.name}</div>
                <div className="ad">{a.desc}</div>
                <div className="af">
                  <span>{a.model}</span>
                  <span>{a.tools} tools</span>
                  <span>τ {a.temp}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <div className="smallcaps" style={{ marginBottom: 10 }}>
              Starter templates
              {templates.status === "loading" && "…"}
              {templates.status === "error" && (
                <span style={{ color: "var(--crimson)", marginLeft: 8 }}>
                  {templates.error}
                </span>
              )}
            </div>
            <div className="agent-grid">
              {(templates.data ?? []).map((t) => (
                <div
                  key={t.id}
                  className="agent-card"
                  onClick={() => void instantiate(t.id)}
                >
                  <div
                    className="mark"
                    style={{
                      background: "var(--lapis-wash)",
                      color: "var(--lapis)",
                      borderColor: "var(--lapis)",
                    }}
                  >
                    {t.initial}
                  </div>
                  <div className="an">{t.name}</div>
                  <div className="ad">{t.desc}</div>
                  <div className="af">
                    <span>template</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
