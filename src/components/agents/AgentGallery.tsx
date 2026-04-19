import { Icon } from "../Icon";
import { SAMPLE_AGENTS } from "../../data/sample";
import type { Agent } from "../../types";

export interface AgentGalleryProps {
  onClose: () => void;
  onOpenBuilder: (agent: Agent | null) => void;
}

interface StarterTemplate {
  name: string;
  desc: string;
  mark: string;
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  { name: "Socratic Tutor", desc: "Leads with questions. Never gives the answer immediately.", mark: "S" },
  { name: "Data Analyst", desc: "SQL + charts. Caveats correlation vs causation.", mark: "D" },
  { name: "Interview Coach", desc: "Mock interviews with structured feedback.", mark: "I" },
];

function templateToAgent(t: StarterTemplate): Agent {
  return {
    id: `tpl-${t.mark.toLowerCase()}`,
    name: t.name,
    initial: t.mark,
    desc: t.desc,
    model: "claude-sonnet-4.5",
    tools: 2,
    temp: 0.5,
  };
}

export function AgentGallery({ onClose, onOpenBuilder }: AgentGalleryProps): JSX.Element {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <Icon name="users" size={18} />
          <div className="title">Agents</div>
          <div className="smallcaps">your library · 6</div>
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
            {SAMPLE_AGENTS.map((a) => (
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
            </div>
            <div className="agent-grid">
              {STARTER_TEMPLATES.map((t) => (
                <div
                  key={t.name}
                  className="agent-card"
                  onClick={() => onOpenBuilder(templateToAgent(t))}
                >
                  <div
                    className="mark"
                    style={{
                      background: "var(--lapis-wash)",
                      color: "var(--lapis)",
                      borderColor: "var(--lapis)",
                    }}
                  >
                    {t.mark}
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
