import { useState } from "react";
import { Icon } from "../Icon";
import { SAMPLE_MODELS, SAMPLE_TOOLS } from "../../data/sample";
import type { ToolDef } from "../../types";

const DEFAULT_SYSTEM_PROMPT = `You are a careful, senior code reviewer. Your reviews are:
– specific (quote lines),
– kind (never scolding),
– opinionated (take a stance),
– bounded (skip nits unless asked).

Always ask one clarifying question before proposing a large refactor.
When suggesting code, respect the repo's existing conventions.`;

export function AgentPanel(): JSX.Element {
  const [temp, setTemp] = useState<number>(0.2);
  const [tools, setTools] = useState<ToolDef[]>(SAMPLE_TOOLS);

  const setToolEnabled = (id: string, v: boolean) =>
    setTools((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: v } : t)));
  const setToolAuto = (id: string, v: boolean) =>
    setTools((prev) => prev.map((t) => (t.id === id ? { ...t, auto: v } : t)));

  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <div style={{ padding: "16px 18px" }}>
      <div className="field">
        <div className="field-label">
          <span>Agent</span>
          <span>v4 · 3 days ago</span>
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
            C
          </div>
          <div style={{ flex: 1 }}>
            <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>
              Code Reviewer
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
              Careful diffs. Flags bugs, style, and test gaps.
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}>
            <Icon name="edit" size={11} />
          </button>
        </div>
      </div>

      <div className="field">
        <div className="field-label">
          <span>Model</span>
          <span>8k ctx</span>
        </div>
        <select className="select">
          {SAMPLE_MODELS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="field-label">
          <span>Temperature</span>
          <span className="mono">{temp.toFixed(2)}</span>
        </div>
        <input
          type="range"
          className="slider"
          min="0"
          max="1"
          step="0.01"
          value={temp}
          onChange={(e) => setTemp(+e.target.value)}
        />
        <div className="field-help">
          Low keeps the model predictable — useful for code & structured output.
        </div>
      </div>

      <div className="field">
        <div className="field-label">
          <span>Tools · {enabledCount} enabled</span>
          <button className="btn btn-ghost" style={{ padding: 0, fontSize: 10 }}>
            MANAGE
          </button>
        </div>
        <div>
          {tools.map((t) => (
            <div key={t.id} className="toggle-row">
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.desc}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label
                  style={{
                    fontSize: 10,
                    color: "var(--ink-3)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  auto
                </label>
                <div
                  className={`toggle ${t.auto ? "on" : ""}`}
                  onClick={() => setToolAuto(t.id, !t.auto)}
                />
                <div
                  className={`toggle ${t.enabled ? "on" : ""}`}
                  onClick={() => setToolEnabled(t.id, !t.enabled)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-label">
          <span>System prompt</span>
          <button
            className="btn btn-ghost"
            style={{ padding: 0, fontSize: 10, display: "inline-flex", gap: 4, alignItems: "center" }}
          >
            <Icon name="wand" size={10} /> OPTIMIZE
          </button>
        </div>
        <textarea className="textarea prompt" defaultValue={DEFAULT_SYSTEM_PROMPT} />
      </div>
    </div>
  );
}
