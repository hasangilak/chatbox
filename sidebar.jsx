/* JSON syntax-highlighting helper */
function syntaxHighlight(obj) {
  const json = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  return json
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = "json-num";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "json-key" : "json-str";
      else if (/true|false/.test(match)) cls = "json-bool";
      else if (/null/.test(match)) cls = "json-null";
      return `<span class="${cls}">${match}</span>`;
    });
}
window.syntaxHighlight = syntaxHighlight;

/* ============================================================
   SIDEBAR
   ============================================================ */
function Sidebar({ activeConv, setActiveConv, activeTag, setActiveTag, onNewChat, onOpenTree, onOpenAgents }) {
  const folders = ["Pinned", "Today", "This week", "Earlier"];
  const convs = window.SAMPLE_CONVERSATIONS.filter(c => activeTag === "all" || c.tag === activeTag);
  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="side-head serif">Conversations</div>
        <button className="icon-btn" onClick={onNewChat} title="New chat"><Icon name="plus" size={15}/></button>
      </div>
      <div className="search">
        <Icon name="search" size={13}/>
        <input placeholder="Search threads, messages, agents…"/>
        <kbd>⌘K</kbd>
      </div>
      <div className="tag-row">
        {window.SAMPLE_TAGS.map(t => (
          <button key={t} className={`tag ${activeTag === t ? "active" : ""}`} onClick={() => setActiveTag(t)}>{t}</button>
        ))}
      </div>
      <div className="conv-list">
        {folders.map(f => {
          const items = convs.filter(c => c.folder === f);
          if (!items.length) return null;
          return (
            <div key={f}>
              <div className="folder-head">
                <span>{f}</span>
                <span className="count">{items.length}</span>
              </div>
              {items.map(c => (
                <div
                  key={c.id}
                  className={`conv ${activeConv === c.id ? "active" : ""}`}
                  onClick={() => setActiveConv(c.id)}
                >
                  <div className="conv-title">{c.title}</div>
                  <div className="conv-meta">
                    {c.pinned && <span className="conv-pin"><Icon name="pin" size={10}/></span>}
                    <span>{c.updated}</span>
                  </div>
                  <div className="conv-snippet">{c.snippet}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ borderTop: "1px solid var(--rule)", padding: "10px 12px", display: "flex", gap: 6 }}>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", display: "inline-flex", gap: 6, alignItems: "center" }} onClick={onOpenTree}>
          <Icon name="tree" size={13}/> Tree view
        </button>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", display: "inline-flex", gap: 6, alignItems: "center" }} onClick={onOpenAgents}>
          <Icon name="users" size={13}/> Agents
        </button>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
