/* ============================================================
   MAIN APP
   ============================================================ */

function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "layout": "atelier",
    "status": "thinking",
    "grain": true,
    "reasonOpen": false,
    "canvas": false,
    "margins": true
  }/*EDITMODE-END*/;

  const [state, setState] = React.useState(TWEAK_DEFAULTS);
  const set = (patch) => {
    setState(s => ({ ...s, ...patch }));
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  };

  const [editMode, setEditMode] = React.useState(false);
  const [activeConv, setActiveConv] = React.useState("c-01");
  const [activeTag, setActiveTag] = React.useState("all");
  const [showTree, setShowTree] = React.useState(false);
  const [showAgents, setShowAgents] = React.useState(false);
  const [builderAgent, setBuilderAgent] = React.useState(undefined);

  // Edit-mode tweaks protocol
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "__activate_edit_mode") setEditMode(true);
      if (e.data?.type === "__deactivate_edit_mode") setEditMode(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  // Apply theme to doc root
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.theme);
    if (!state.grain) document.body.style.backgroundImage = "none";
    else document.body.style.backgroundImage = "";
  }, [state.theme, state.grain]);

  const tree = window.SAMPLE_TREE;

  // Walk the active leaf up to root to get the linear thread
  const linearThread = React.useMemo(() => {
    const chain = [];
    let cur = tree.nodes[tree.activeLeaf];
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent ? tree.nodes[cur.parent] : null;
    }
    return chain;
  }, []);

  return (
    <div className={`app layout-${state.layout} ${state.canvas ? "canvas-open" : ""}`} data-screen-label="Main · Workbench">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span className="brand-title serif">Workbench</span>
          <span className="brand-sub">LLM studio</span>
        </div>
        <div className="topbar-sep"/>
        <div className="crumb">
          <span>Workspace</span><span className="sep">/</span>
          <span>Pinned</span><span className="sep">/</span>
          <span className="current">Retry policy refactor</span>
        </div>
        <div className="topbar-right">
          <div className="layout-switch" title="Layout">
            <button className={state.layout === "atelier" ? "active" : ""} onClick={() => set({ layout: "atelier" })}>Atelier</button>
            <button className={state.layout === "ledger" ? "active" : ""} onClick={() => set({ layout: "ledger" })}>Ledger</button>
            <button className={state.layout === "workshop" ? "active" : ""} onClick={() => set({ layout: "workshop" })}>Workshop</button>
          </div>
          <button className="icon-btn" onClick={() => set({ canvas: !state.canvas })} title="Canvas"><Icon name="canvas" size={14}/></button>
          <button className="icon-btn" onClick={() => setShowAgents(true)} title="Agents"><Icon name="users" size={14}/></button>
          <button className="icon-btn" onClick={() => setShowTree(true)} title="Message tree"><Icon name="tree" size={14}/></button>
          <button className="icon-btn" onClick={() => set({ theme: state.theme === "light" ? "dark" : "light" })} title="Theme">
            <Icon name={state.theme === "light" ? "moon" : "sun"} size={14}/>
          </button>
          <div style={{ marginLeft: 6, width: 28, height: 28, borderRadius: 999, background: "var(--ochre-wash)", color: "var(--ochre-ink)", display: "grid", placeItems: "center", fontFamily: "Fraunces, serif", fontWeight: 500, border: "1px solid var(--rule)" }}>A</div>
        </div>
      </header>

      {/* SIDEBAR */}
      <Sidebar
        activeConv={activeConv}
        setActiveConv={setActiveConv}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        onNewChat={() => setActiveConv("new")}
        onOpenTree={() => setShowTree(true)}
        onOpenAgents={() => setShowAgents(true)}
      />

      {/* CENTER */}
      <main className="center">
        <div className="thread-head">
          <div className="thread-title serif">Refactoring the retry policy in orders-service</div>
          <div className="agent-chip">
            <span className="agent-dot">C</span>
            Code Reviewer
            <span className="pill mono">claude-sonnet-4.5</span>
          </div>
          <div className="thread-actions">
            <button className="icon-btn" title="Share"><Icon name="share" size={13}/></button>
            <button className="icon-btn" title="Export"><Icon name="export" size={13}/></button>
            <button className="icon-btn" title="Pin"><Icon name="pin" size={13}/></button>
            <button className="icon-btn" title="More"><Icon name="dots" size={13}/></button>
          </div>
        </div>

        <div className="thread">
          {linearThread.map((n, i) => (
            <Message
              key={n.id}
              node={n}
              index={i + 1}
              onEdit={() => {}}
              onBranch={() => setShowTree(true)}
            />
          ))}

          {/* live status */}
          <div className="msg">
            <div className="msg-num"/>
            <div className="msg-body">
              <StatusLine state={state.status} tool="run_tests" elapsed="3.8s"/>
            </div>
            <div className="msg-gutter"/>
          </div>

          <div className="ornament">❧ · ❦</div>
        </div>

        {/* COMPOSER */}
        <div className="composer-wrap">
          <div className="composer">
            <div className="composer-top">
              <span className="composer-chip selected"><Icon name="users" size={10}/> Code Reviewer</span>
              <span className="composer-chip"><Icon name="tool" size={10}/> 4 tools</span>
              <span className="composer-chip"><Icon name="attach" size={10}/> repo: orders-service</span>
              <span className="composer-chip"><Icon name="brain" size={10}/> reasoning · high</span>
              <span style={{ flex: 1 }}/>
              <span className="smallcaps" style={{ color: "var(--ink-4)" }}>8 132 / 200k tokens</span>
            </div>
            <textarea placeholder="Ask Code Reviewer… ( / for commands · @ for agents · # for files )"/>
            <div className="composer-foot">
              <button className="icon-btn"><Icon name="attach" size={13}/></button>
              <button className="icon-btn"><Icon name="tool" size={13}/></button>
              <button className="icon-btn"><Icon name="brain" size={13}/></button>
              <div className="spacer"/>
              <span className="smallcaps" style={{ color: "var(--ink-4)" }}>shift-return for newline</span>
              <button className="send-btn">
                Send <kbd>↵</kbd>
              </button>
            </div>
          </div>
        </div>

        {state.canvas && <CanvasPane onClose={() => set({ canvas: false })}/>}
      </main>

      {/* INSPECTOR */}
      <Inspector/>

      {showTree && <TreeView onClose={() => setShowTree(false)}/>}
      {showAgents && !builderAgent && (
        <AgentGallery onClose={() => setShowAgents(false)} onOpenBuilder={(a) => setBuilderAgent(a || null)}/>
      )}
      {builderAgent !== undefined && (
        <AgentBuilder agent={builderAgent} onClose={() => { setBuilderAgent(undefined); }}/>
      )}

      {editMode && <TweaksPanel state={state} set={set} onClose={() => setEditMode(false)}/>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
