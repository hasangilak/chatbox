/* Agent gallery & builder modal */

function AgentGallery({ onClose, onOpenBuilder }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <Icon name="users" size={18}/>
          <div className="title">Agents</div>
          <div className="smallcaps">your library · 6</div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="agent-grid">
            <div className="agent-card" onClick={() => onOpenBuilder(null)} style={{ background: "var(--paper-2)", borderStyle: "dashed", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ fontSize: 24, color: "var(--ink-3)" }}><Icon name="plus" size={20}/></div>
              <div className="an" style={{ fontSize: 14 }}>New agent</div>
              <div className="ad" style={{ flex: "none" }}>Start from a blank slate or a template.</div>
            </div>
            {window.SAMPLE_AGENTS.map(a => (
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
            <div className="smallcaps" style={{ marginBottom: 10 }}>Starter templates</div>
            <div className="agent-grid">
              {[
                { name: "Socratic Tutor", desc: "Leads with questions. Never gives the answer immediately.", mark: "S" },
                { name: "Data Analyst", desc: "SQL + charts. Caveats correlation vs causation.", mark: "D" },
                { name: "Interview Coach", desc: "Mock interviews with structured feedback.", mark: "I" },
              ].map(t => (
                <div key={t.name} className="agent-card" onClick={() => onOpenBuilder({ name: t.name, initial: t.mark, desc: t.desc, model: "claude-sonnet-4.5", tools: 2, temp: 0.5 })}>
                  <div className="mark" style={{ background: "var(--lapis-wash)", color: "var(--lapis)", borderColor: "var(--lapis)" }}>{t.mark}</div>
                  <div className="an">{t.name}</div>
                  <div className="ad">{t.desc}</div>
                  <div className="af"><span>template</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentBuilder({ agent, onClose }) {
  const [temp, setTemp] = React.useState(agent?.temp || 0.5);
  const [optimizing, setOptimizing] = React.useState(false);
  const [showVersions, setShowVersions] = React.useState(false);
  const tools = window.SAMPLE_TOOLS;
  const name = agent?.name || "New agent";

  const promptHtml = `You are a <span class="var">&#123;&#123;role&#125;&#125;</span> for <span class="var">&#123;&#123;user_name&#125;&#125;</span>.

Your reviews are specific (quote lines), kind (never scolding), opinionated (take a stance), and bounded (skip nits).

Always ask <span class="var">&#123;&#123;clarifier_count&#125;&#125;</span> clarifying question before proposing a large refactor.
Respect the repo conventions in <span class="var">&#123;&#123;project_root&#125;&#125;</span>.`;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 1100, width: "95vw", maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="agent-dot" style={{ width: 32, height: 32, fontSize: 15 }}>{agent?.initial || "N"}</div>
          <div className="title">{name}</div>
          <div className="smallcaps" style={{ color: "var(--ink-3)" }}>v4 · edited 3 days ago</div>
          <button className="btn btn-ghost" style={{ display: "inline-flex", gap: 6, alignItems: "center" }} onClick={() => setShowVersions(!showVersions)}>
            <Icon name="clock" size={12}/> Versions
          </button>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* main column: prompt + optimizer */}
          <div style={{ overflowY: "auto", padding: "20px 24px", borderRight: "1px solid var(--rule)" }}>
            <div className="field">
              <div className="field-label">
                <span>Identity</span>
              </div>
              <input className="input" defaultValue={name} placeholder="Agent name"/>
              <textarea className="textarea" style={{ minHeight: 60, fontFamily: "IBM Plex Sans, sans-serif", fontSize: 13 }} defaultValue={agent?.desc || "One sentence about what this agent does."}/>
            </div>

            <div className="field">
              <div className="field-label">
                <span>System prompt · with variables</span>
                <button className="btn btn-ghost" style={{ padding: 0, fontSize: 10, display: "inline-flex", gap: 4, alignItems: "center" }} onClick={() => setOptimizing(true)}><Icon name="wand" size={11}/> IMPROVE</button>
              </div>
              <div
                className="textarea prompt"
                contentEditable
                suppressContentEditableWarning
                style={{ minHeight: 220, whiteSpace: "pre-wrap" }}
                dangerouslySetInnerHTML={{ __html: promptHtml }}
              />
              <div className="field-help">
                Use <span className="var">&#123;&#123;variable&#125;&#125;</span> syntax. Defined variables: role, user_name, clarifier_count, project_root.
              </div>
            </div>

            {optimizing && (
              <div className="field" style={{ border: "1px solid var(--lapis)", background: "var(--lapis-wash)", padding: 14, borderRadius: 3 }}>
                <div className="field-label" style={{ color: "var(--lapis)" }}>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Icon name="wand" size={11}/> Prompt optimizer · draft</span>
                  <span className="mono">+17% on held-out set</span>
                </div>
                <div className="serif" style={{ fontSize: 13.5, fontStyle: "italic", lineHeight: 1.55, color: "var(--ink)" }}>
                  Consider adding: <em className="mark">"Before proposing changes, list assumptions you're making in one sentence."</em> — this lifts precision on under-specified tasks by 9%, with no regression on simple ones.
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={() => setOptimizing(false)}><Icon name="check" size={11}/>&nbsp;Apply</button>
                  <button className="btn" onClick={() => setOptimizing(false)}>Try another</button>
                  <button className="btn btn-ghost" onClick={() => setOptimizing(false)}>Dismiss</button>
                </div>
              </div>
            )}

            <div className="field">
              <div className="field-label"><span>Variables</span><button className="btn btn-ghost" style={{ padding: 0, fontSize: 10 }}>+ ADD</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 8, fontSize: 12 }}>
                <div className="smallcaps">Name</div><div className="smallcaps">Default</div><div className="smallcaps">Description</div>
                {[["role","senior code reviewer","the voice"],["user_name","Ali","who we're talking to"],["clarifier_count","one","0 to skip"],["project_root","./","base path"]].map(r => (
                  <React.Fragment key={r[0]}>
                    <input className="input" defaultValue={r[0]} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}/>
                    <input className="input" defaultValue={r[1]}/>
                    <input className="input" defaultValue={r[2]}/>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="field-label"><span>Evaluation</span><span>8 held-out cases</span></div>
              <div style={{ border: "1px solid var(--rule)", borderRadius: 3, padding: 12, background: "var(--paper-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 500 }}>82%</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>pass rate · v4 vs v3 <span style={{ color: "var(--sage)" }}>+6%</span></div>
                  <button className="btn btn-primary" style={{ marginLeft: "auto", padding: "5px 12px" }}><Icon name="play" size={10}/>&nbsp;Run eval</button>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1,1,1,1,1,1,0,1].map((v,i) => (
                    <div key={i} style={{ flex: 1, height: 22, background: v ? "var(--sage)" : "var(--crimson)", opacity: 0.75, borderRadius: 2 }}/>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* right: params, tools, versions */}
          <div style={{ overflowY: "auto", padding: "20px 22px", background: "var(--paper-2)" }}>
            {showVersions ? (
              <div>
                <div className="field-label"><span>Version history</span></div>
                {[
                  { v: "v4", ago: "3d ago · current", msg: "Add clarifier_count variable", score: 82 },
                  { v: "v3", ago: "1w ago", msg: "Tighten tone; allow dissent", score: 76 },
                  { v: "v2", ago: "3w ago", msg: "First real draft", score: 64 },
                  { v: "v1", ago: "1mo ago", msg: "From template · code-reviewer", score: 58 },
                ].map((h, i) => (
                  <div key={i} style={{ border: "1px solid var(--rule)", borderRadius: 3, padding: 10, marginBottom: 8, background: "var(--paper)" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>{h.v}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{h.ago}</div>
                      <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--sage)" }} className="mono">{h.score}%</div>
                    </div>
                    <div className="serif" style={{ fontSize: 12.5, fontStyle: "italic", color: "var(--ink-2)", marginTop: 2 }}>{h.msg}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }}>Restore</button>
                      <button className="btn btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }}>Diff v4</button>
                    </div>
                  </div>
                ))}
                <button className="btn btn-ghost" onClick={() => setShowVersions(false)} style={{ width: "100%", marginTop: 4 }}>← Back</button>
              </div>
            ) : (
              <React.Fragment>
                <div className="field">
                  <div className="field-label"><span>Model</span></div>
                  <select className="select">
                    {window.SAMPLE_MODELS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <div className="field-label"><span>Temperature</span><span className="mono">{temp.toFixed(2)}</span></div>
                  <input type="range" className="slider" min="0" max="1" step="0.01" value={temp} onChange={e => setTemp(+e.target.value)}/>
                </div>
                <div className="field">
                  <div className="field-label"><span>Top-p</span><span className="mono">1.00</span></div>
                  <input type="range" className="slider" min="0" max="1" step="0.01" defaultValue="1"/>
                </div>
                <div className="field">
                  <div className="field-label"><span>Max tokens</span><span className="mono">4096</span></div>
                  <input type="range" className="slider" min="256" max="16384" step="256" defaultValue="4096"/>
                </div>

                <div className="field">
                  <div className="field-label"><span>Tools</span><span>{tools.filter(t => t.enabled).length}/{tools.length}</span></div>
                  {tools.map(t => (
                    <div key={t.id} className="toggle-row">
                      <div style={{ minWidth: 0 }}>
                        <div className="mono" style={{ fontSize: 12 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.desc}</div>
                      </div>
                      <div className={`toggle ${t.enabled ? "on" : ""}`}/>
                    </div>
                  ))}
                </div>

                <div className="field">
                  <div className="field-label"><span>Permissions default</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {["Ask every time", "Auto-allow read tools", "Auto-allow all"].map((p, i) => (
                      <label key={p} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, padding: 6, border: "1px solid var(--rule)", borderRadius: 2, background: i === 0 ? "var(--paper)" : "transparent", cursor: "pointer" }}>
                        <input type="radio" name="perm" defaultChecked={i === 0}/>
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Discard</button>
          <div style={{ flex: 1 }}/>
          <button className="btn">Save as draft</button>
          <button className="btn btn-primary"><Icon name="check" size={11}/>&nbsp;Save · new version</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AgentGallery, AgentBuilder });
