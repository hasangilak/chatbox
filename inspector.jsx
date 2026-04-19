/* Inspector panel — tabbed: Timeline, Agent, Tools, Notes */

function Timeline() {
  const rows = [
    { t: "11:28:02", kind: "user",   label: "You · sent", sub: "Walk me through refactoring the retry policy…" },
    { t: "11:28:03", kind: "reason", label: "Reasoning · 4 steps", sub: "Diagnose → read code → draft policy" },
    { t: "11:28:05", kind: "tool",   label: "read_file", sub: "services/orders/src/retry.ts · 0.4s · 18 lines", status: "ok" },
    { t: "11:28:06", kind: "clar",   label: "Clarifying question", sub: "Idempotency, jitter, budget, OTel?" },
    { t: "11:30:11", kind: "user",   label: "You · sent", sub: "Payments API uses Idempotency-Key…" },
    { t: "11:31:02", kind: "reason", label: "Reasoning · 4 steps", sub: "Full-jitter + retry budget + deadline" },
    { t: "11:31:10", kind: "perm",   label: "Permission · write_file", sub: "Allowed once by you" },
    { t: "11:33:22", kind: "user",   label: "You · sent", sub: "Approved. Also add OTel spans." },
    { t: "11:34:01", kind: "tool",   label: "write_file", sub: "3 files · 1.1s · +222 −9", status: "ok" },
    { t: "11:34:08", kind: "stream", label: "Streaming summary", sub: "128 tokens · in progress", status: "pending" },
  ];
  const dot = (r) => {
    if (r.status === "ok") return "ok";
    if (r.status === "pending") return "pending";
    if (r.status === "err") return "err";
    if (r.kind === "reason") return "reason";
    return "";
  };
  return (
    <div className="timeline">
      {rows.map((r, i) => (
        <div className="timeline-row" key={i}>
          <div className="t">{r.t}</div>
          <div className="rail"><span className={`node ${dot(r)}`}/></div>
          <div className="body">
            <div className="ev">{r.label}</div>
            <div className="sub">{r.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentPanel() {
  const [temp, setTemp] = React.useState(0.2);
  const [tools, setTools] = React.useState(window.SAMPLE_TOOLS);
  const setToolEnabled = (id, v) => setTools(tools.map(t => t.id === id ? { ...t, enabled: v } : t));
  const setToolAuto = (id, v) => setTools(tools.map(t => t.id === id ? { ...t, auto: v } : t));
  return (
    <div style={{ padding: "16px 18px" }}>
      <div className="field">
        <div className="field-label"><span>Agent</span><span>v4 · 3 days ago</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--rule)", borderRadius: 3, background: "var(--paper-2)" }}>
          <div className="agent-dot" style={{ width: 32, height: 32, fontSize: 15 }}>C</div>
          <div style={{ flex: 1 }}>
            <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>Code Reviewer</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Careful diffs. Flags bugs, style, and test gaps.</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}><Icon name="edit" size={11}/></button>
        </div>
      </div>

      <div className="field">
        <div className="field-label"><span>Model</span><span>8k ctx</span></div>
        <select className="select">
          {window.SAMPLE_MODELS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="field">
        <div className="field-label">
          <span>Temperature</span>
          <span className="mono">{temp.toFixed(2)}</span>
        </div>
        <input type="range" className="slider" min="0" max="1" step="0.01" value={temp} onChange={e => setTemp(+e.target.value)}/>
        <div className="field-help">Low keeps the model predictable — useful for code & structured output.</div>
      </div>

      <div className="field">
        <div className="field-label"><span>Tools · {tools.filter(t => t.enabled).length} enabled</span><button className="btn btn-ghost" style={{ padding: 0, fontSize: 10 }}>MANAGE</button></div>
        <div>
          {tools.map(t => (
            <div key={t.id} className="toggle-row">
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.desc}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>auto</label>
                <div className={`toggle ${t.auto ? "on" : ""}`} onClick={() => setToolAuto(t.id, !t.auto)}/>
                <div className={`toggle ${t.enabled ? "on" : ""}`} onClick={() => setToolEnabled(t.id, !t.enabled)}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-label"><span>System prompt</span><button className="btn btn-ghost" style={{ padding: 0, fontSize: 10, display: "inline-flex", gap: 4, alignItems: "center" }}><Icon name="wand" size={10}/> OPTIMIZE</button></div>
        <textarea className="textarea prompt" defaultValue={`You are a careful, senior code reviewer. Your reviews are:
– specific (quote lines),
– kind (never scolding),
– opinionated (take a stance),
– bounded (skip nits unless asked).

Always ask one clarifying question before proposing a large refactor.
When suggesting code, respect the repo's existing conventions.`}/>
      </div>
    </div>
  );
}

function NotesPanel() {
  return (
    <div style={{ padding: "16px 18px" }}>
      <div className="field">
        <div className="field-label"><span>Thread notes</span><span>local</span></div>
        <textarea className="textarea prompt" defaultValue={`Priority: unblock payments team before Friday. Ask about metrics before we ship — they had an SLO burn last week.`}/>
      </div>
      <div className="field">
        <div className="field-label"><span>Pinned snippets</span><span>2</span></div>
        <div style={{ border: "1px solid var(--rule)", borderRadius: 3, padding: 10, marginBottom: 8, background: "var(--paper-2)" }}>
          <div className="smallcaps">Retry policy · from msg 03</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 13, fontStyle: "italic", color: "var(--ink-2)" }}>
            Classification + full-jitter + retry budget + OTel spans.
          </div>
        </div>
        <div style={{ border: "1px solid var(--rule)", borderRadius: 3, padding: 10, background: "var(--paper-2)" }}>
          <div className="smallcaps">Deadline · from msg 03</div>
          <div className="mono" style={{ fontSize: 12 }}>30s per order write</div>
        </div>
      </div>
    </div>
  );
}

function Inspector() {
  const [tab, setTab] = React.useState("timeline");
  return (
    <aside className="inspector">
      <div className="insp-tabs">
        {["timeline", "agent", "notes"].map(t => (
          <button key={t} className={`insp-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
        <div style={{ flex: 1 }}/>
        <button className="icon-btn" style={{ alignSelf: "center", marginBottom: 6 }} title="Collapse"><Icon name="chev" size={13}/></button>
      </div>
      <div className="insp-body">
        {tab === "timeline" && <Timeline/>}
        {tab === "agent" && <AgentPanel/>}
        {tab === "notes" && <NotesPanel/>}
      </div>
    </aside>
  );
}

Object.assign(window, { Inspector, Timeline, AgentPanel, NotesPanel });
