import { Fragment, useEffect, useMemo, useState } from "react";
import { Icon } from "../Icon";
import { useTools } from "../../state/useWorkspace";
import {
  createAgent,
  getAgentFull,
  getEvalRun,
  listAgentVersions,
  optimizeAgent,
  patchAgent,
  restoreAgentVersion,
  startEval,
} from "../../api/agents";
import type { Agent } from "../../types";
import type {
  AgentFull,
  AgentVariable,
  AgentVersion,
  EvalResult,
  OptimizerSuggestion,
  PermissionDefault,
} from "../../api/wire";

export interface AgentBuilderProps {
  agent: Agent | AgentFull | null;
  onClose: () => void;
}

const PERMISSION_OPTIONS: Array<[PermissionDefault, string]> = [
  ["ask_every_time", "Ask every time"],
  ["auto_allow_read", "Auto-allow read tools"],
  ["auto_allow_all", "Auto-allow all"],
];

function isFull(a: Agent | AgentFull | null): a is AgentFull {
  return a !== null && "system_prompt" in a;
}

function blankAgent(): AgentFull {
  return {
    id: "",
    name: "New agent",
    initial: "N",
    desc: "One sentence about what this agent does.",
    model: "claude-sonnet-4.5",
    temperature: 0.5,
    top_p: 1,
    max_tokens: 4096,
    system_prompt: "",
    variables: [],
    tool_ids: [],
    permission_default: "ask_every_time",
    current_version_id: null,
  };
}

export function AgentBuilder({ agent, onClose }: AgentBuilderProps): JSX.Element {
  const [draft, setDraft] = useState<AgentFull | null>(
    isFull(agent) ? agent : agent ? null : blankAgent(),
  );
  const [loading, setLoading] = useState<boolean>(agent !== null && !isFull(agent));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [showVersions, setShowVersions] = useState<boolean>(false);
  const [versions, setVersions] = useState<AgentVersion[] | null>(null);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<OptimizerSuggestion | null>(null);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [evalRun, setEvalRun] = useState<EvalResult | null>(null);
  const [evalBusy, setEvalBusy] = useState<boolean>(false);

  const tools = useTools();

  useEffect(() => {
    if (agent && !isFull(agent)) {
      setLoading(true);
      setLoadError(null);
      getAgentFull(agent.id)
        .then((full) => {
          setDraft(full);
        })
        .catch((err) => {
          setLoadError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => setLoading(false));
    } else if (isFull(agent)) {
      setDraft(agent);
    } else if (agent === null) {
      setDraft(blankAgent());
    }
  }, [agent]);

  const loadVersions = async () => {
    if (!draft?.id) return;
    setVersionsError(null);
    try {
      const v = await listAgentVersions(draft.id);
      setVersions(v);
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (showVersions && !versions) void loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVersions]);

  const update = (patch: Partial<AgentFull>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const updateVariable = (index: number, patch: Partial<AgentVariable>) =>
    setDraft((d) => {
      if (!d) return d;
      const next = d.variables.slice();
      const existing = next[index];
      if (!existing) return d;
      next[index] = { ...existing, ...patch };
      return { ...d, variables: next };
    });

  const addVariable = () =>
    update({
      variables: [...(draft?.variables ?? []), { name: "", default: "", description: "" }],
    });

  const toggleTool = (id: string) => {
    if (!draft) return;
    const has = draft.tool_ids.includes(id);
    update({
      tool_ids: has ? draft.tool_ids.filter((t) => t !== id) : [...draft.tool_ids, id],
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (!draft.id) {
        const created = await createAgent({
          name: draft.name,
          initial: draft.initial,
          desc: draft.desc,
          model: draft.model,
          temperature: draft.temperature,
          top_p: draft.top_p,
          max_tokens: draft.max_tokens,
          system_prompt: draft.system_prompt,
          variables: draft.variables,
          tool_ids: draft.tool_ids,
          permission_default: draft.permission_default,
          message: commitMessage || "initial version",
        });
        setDraft(created);
      } else {
        const res = await patchAgent(draft.id, {
          name: draft.name,
          initial: draft.initial,
          desc: draft.desc,
          model: draft.model,
          temperature: draft.temperature,
          top_p: draft.top_p,
          max_tokens: draft.max_tokens,
          system_prompt: draft.system_prompt,
          variables: draft.variables,
          tool_ids: draft.tool_ids,
          permission_default: draft.permission_default,
          message: commitMessage || "updated",
        });
        setDraft(res.agent);
        setVersions(null);
      }
      setCommitMessage("");
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const runOptimize = async () => {
    if (!draft?.id) return;
    setOptimizing(true);
    try {
      const res = await optimizeAgent(draft.id);
      setSuggestion(res.suggestion);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setOptimizing(false);
    }
  };

  const applySuggestion = () => {
    if (!draft || !suggestion) return;
    update({
      system_prompt: draft.system_prompt.replace(
        suggestion.patch.before,
        suggestion.patch.after,
      ),
    });
    setSuggestion(null);
  };

  const runEval = async () => {
    if (!draft?.id) return;
    setEvalBusy(true);
    try {
      const { job_id } = await startEval(draft.id);
      const result = await getEvalRun(draft.id, job_id);
      setEvalRun(result);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvalBusy(false);
    }
  };

  const restore = async (version: number) => {
    if (!draft?.id) return;
    setRestoring(version);
    try {
      const res = await restoreAgentVersion(draft.id, version);
      setDraft(res.agent);
      setVersions(null);
      setShowVersions(false);
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : String(err));
    } finally {
      setRestoring(null);
    }
  };

  const toolList = tools.data ?? [];
  const enabledCount = draft ? draft.tool_ids.length : 0;

  const evalBars = useMemo(() => {
    if (!evalRun) return null;
    return evalRun.cases.map((c, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 22,
          background: c.passed ? "var(--sage)" : "var(--crimson)",
          opacity: 0.75,
          borderRadius: 2,
        }}
        title={c.expected_behavior}
      />
    ));
  }, [evalRun]);

  if (loading || !draft) {
    return (
      <div className="overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div className="title">Loading agent…</div>
            <button className="icon-btn" onClick={onClose}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <div style={{ padding: 40, color: "var(--ink-3)" }}>
            {loadError ?? "Fetching full agent definition."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 1100, width: "95vw", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="agent-dot" style={{ width: 32, height: 32, fontSize: 15 }}>
            {draft.initial || "N"}
          </div>
          <div className="title">{draft.name || "New agent"}</div>
          <div className="smallcaps" style={{ color: "var(--ink-3)" }}>
            {draft.id ? "editing" : "new"}
          </div>
          <button
            className="btn btn-ghost"
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
            onClick={() => setShowVersions((v) => !v)}
            disabled={!draft.id}
          >
            <Icon name="clock" size={12} /> Versions
          </button>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              overflowY: "auto",
              padding: "20px 24px",
              borderRight: "1px solid var(--rule)",
            }}
          >
            <div className="field">
              <div className="field-label">
                <span>Identity</span>
              </div>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Agent name"
              />
              <input
                className="input"
                value={draft.initial}
                onChange={(e) => update({ initial: e.target.value.slice(0, 2) })}
                placeholder="Avatar letter"
                style={{ marginTop: 6, width: 120 }}
              />
              <textarea
                className="textarea"
                style={{
                  minHeight: 60,
                  fontFamily: "IBM Plex Sans, sans-serif",
                  fontSize: 13,
                  marginTop: 6,
                }}
                value={draft.desc}
                onChange={(e) => update({ desc: e.target.value })}
              />
            </div>

            <div className="field">
              <div className="field-label">
                <span>System prompt · with variables</span>
                <button
                  className="btn btn-ghost"
                  style={{
                    padding: 0,
                    fontSize: 10,
                    display: "inline-flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                  onClick={() => void runOptimize()}
                  disabled={!draft.id || optimizing}
                  title={draft.id ? undefined : "Save first to run the optimizer"}
                >
                  <Icon name="wand" size={11} /> {optimizing ? "WORKING…" : "IMPROVE"}
                </button>
              </div>
              <textarea
                className="textarea prompt"
                style={{ minHeight: 220, whiteSpace: "pre-wrap" }}
                value={draft.system_prompt}
                onChange={(e) => update({ system_prompt: e.target.value })}
              />
              <div className="field-help">
                Use <span className="var">&#123;&#123;variable&#125;&#125;</span> syntax.
              </div>
            </div>

            {suggestion && (
              <div
                className="field"
                style={{
                  border: "1px solid var(--lapis)",
                  background: "var(--lapis-wash)",
                  padding: 14,
                  borderRadius: 3,
                }}
              >
                <div className="field-label" style={{ color: "var(--lapis)" }}>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <Icon name="wand" size={11} /> Prompt optimizer · draft
                  </span>
                  <span className="mono">
                    {suggestion.predicted_delta_pct >= 0 ? "+" : ""}
                    {suggestion.predicted_delta_pct.toFixed(1)}% on held-out set
                  </span>
                </div>
                <div
                  className="serif"
                  style={{
                    fontSize: 13.5,
                    fontStyle: "italic",
                    lineHeight: 1.55,
                    color: "var(--ink)",
                  }}
                >
                  {suggestion.suggestion_text}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}
                >
                  {suggestion.rationale}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={applySuggestion}>
                    <Icon name="check" size={11} />
                    &nbsp;Apply
                  </button>
                  <button className="btn" onClick={() => void runOptimize()}>
                    Try another
                  </button>
                  <button className="btn btn-ghost" onClick={() => setSuggestion(null)}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="field">
              <div className="field-label">
                <span>Variables</span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: 0, fontSize: 10 }}
                  onClick={addVariable}
                >
                  + ADD
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 1fr",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div className="smallcaps">Name</div>
                <div className="smallcaps">Default</div>
                <div className="smallcaps">Description</div>
                {draft.variables.map((v, i) => (
                  <Fragment key={i}>
                    <input
                      className="input"
                      value={v.name}
                      onChange={(e) => updateVariable(i, { name: e.target.value })}
                      style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
                    />
                    <input
                      className="input"
                      value={v.default}
                      onChange={(e) => updateVariable(i, { default: e.target.value })}
                    />
                    <input
                      className="input"
                      value={v.description}
                      onChange={(e) => updateVariable(i, { description: e.target.value })}
                    />
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="field-label">
                <span>Evaluation</span>
                <span>{evalRun?.cases.length ? `${evalRun.cases.length} cases` : "n/a"}</span>
              </div>
              <div
                style={{
                  border: "1px solid var(--rule)",
                  borderRadius: 3,
                  padding: 12,
                  background: "var(--paper-2)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
                >
                  <div className="serif" style={{ fontSize: 16, fontWeight: 500 }}>
                    {evalRun?.pass_rate !== null && evalRun?.pass_rate !== undefined
                      ? `${Math.round(evalRun.pass_rate * 100)}%`
                      : "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    pass rate
                    {evalRun?.delta_vs_previous_pct !== null &&
                    evalRun?.delta_vs_previous_pct !== undefined ? (
                      <span
                        style={{
                          color:
                            evalRun.delta_vs_previous_pct >= 0
                              ? "var(--sage)"
                              : "var(--crimson)",
                        }}
                      >
                        {` ${evalRun.delta_vs_previous_pct >= 0 ? "+" : ""}${evalRun.delta_vs_previous_pct.toFixed(1)}%`}
                      </span>
                    ) : null}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: "auto", padding: "5px 12px" }}
                    onClick={() => void runEval()}
                    disabled={evalBusy || !draft.id}
                  >
                    <Icon name="play" size={10} />
                    &nbsp;{evalBusy ? "Running…" : "Run eval"}
                  </button>
                </div>
                {evalBars && <div style={{ display: "flex", gap: 2 }}>{evalBars}</div>}
              </div>
            </div>
          </div>

          <div
            style={{
              overflowY: "auto",
              padding: "20px 22px",
              background: "var(--paper-2)",
            }}
          >
            {showVersions ? (
              <div>
                <div className="field-label">
                  <span>Version history</span>
                </div>
                {versionsError && (
                  <div
                    style={{ color: "var(--crimson)", fontSize: 11.5, marginBottom: 8 }}
                  >
                    {versionsError}
                  </div>
                )}
                {(versions ?? []).map((h) => (
                  <div
                    key={h.id}
                    style={{
                      border: "1px solid var(--rule)",
                      borderRadius: 3,
                      padding: 10,
                      marginBottom: 8,
                      background: "var(--paper)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>
                        v{h.version}
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                      {h.eval_score !== null && (
                        <div
                          style={{ marginLeft: "auto", fontSize: 11, color: "var(--sage)" }}
                          className="mono"
                        >
                          {Math.round(h.eval_score * 100)}%
                        </div>
                      )}
                    </div>
                    <div
                      className="serif"
                      style={{
                        fontSize: 12.5,
                        fontStyle: "italic",
                        color: "var(--ink-2)",
                        marginTop: 2,
                      }}
                    >
                      {h.message}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        onClick={() => void restore(h.version)}
                        disabled={restoring !== null}
                      >
                        {restoring === h.version ? "Restoring…" : "Restore"}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowVersions(false)}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  ← Back
                </button>
              </div>
            ) : (
              <Fragment>
                <div className="field">
                  <div className="field-label">
                    <span>Model</span>
                  </div>
                  <input
                    className="input"
                    value={draft.model}
                    onChange={(e) => update({ model: e.target.value })}
                  />
                </div>
                <div className="field">
                  <div className="field-label">
                    <span>Temperature</span>
                    <span className="mono">{draft.temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="0"
                    max="2"
                    step="0.01"
                    value={draft.temperature}
                    onChange={(e) => update({ temperature: +e.target.value })}
                  />
                </div>
                <div className="field">
                  <div className="field-label">
                    <span>Top-p</span>
                    <span className="mono">{draft.top_p.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draft.top_p}
                    onChange={(e) => update({ top_p: +e.target.value })}
                  />
                </div>
                <div className="field">
                  <div className="field-label">
                    <span>Max tokens</span>
                    <span className="mono">{draft.max_tokens}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="256"
                    max="16384"
                    step="256"
                    value={draft.max_tokens}
                    onChange={(e) => update({ max_tokens: +e.target.value })}
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span>Tools</span>
                    <span>
                      {enabledCount}/{toolList.length}
                    </span>
                  </div>
                  {toolList.map((t) => {
                    const on = draft.tool_ids.includes(t.id);
                    return (
                      <div key={t.id} className="toggle-row">
                        <div style={{ minWidth: 0 }}>
                          <div className="mono" style={{ fontSize: 12 }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.desc}</div>
                        </div>
                        <div
                          className={`toggle ${on ? "on" : ""}`}
                          onClick={() => toggleTool(t.id)}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="field">
                  <div className="field-label">
                    <span>Permissions default</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {PERMISSION_OPTIONS.map(([value, label]) => (
                      <label
                        key={value}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          fontSize: 12.5,
                          padding: 6,
                          border: "1px solid var(--rule)",
                          borderRadius: 2,
                          background:
                            draft.permission_default === value ? "var(--paper)" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="perm"
                          checked={draft.permission_default === value}
                          onChange={() => update({ permission_default: value })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </Fragment>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Discard
          </button>
          <input
            className="input"
            placeholder="commit message (optional)"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            style={{ maxWidth: 280, marginLeft: 8 }}
          />
          {saveError && (
            <span style={{ color: "var(--crimson)", fontSize: 11.5, marginLeft: 8 }}>
              {saveError}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-primary"
            onClick={() => void save()}
            disabled={saving}
          >
            <Icon name="check" size={11} />
            &nbsp;{saving ? "Saving…" : draft.id ? "Save · new version" : "Create agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
