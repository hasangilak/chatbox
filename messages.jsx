/* Message components: reasoning blocks, tool calls, approval, clarification, status */

function ReasoningBlock({ steps, streaming, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen || streaming);
  return (
    <div className={`reason ${open ? "open" : ""} ${streaming ? "streaming" : ""}`}>
      <div className="reason-head" onClick={() => setOpen(!open)}>
        <span className="reason-caret"><Icon name="chev" size={10}/></span>
        <span className="reason-label">{streaming ? "Pondering" : "Reasoning"}</span>
        <span className="reason-time">{steps.length} step{steps.length !== 1 ? "s" : ""} · 1.8s</span>
      </div>
      <div className="reason-body">
        {steps.map((s, i) => <span className="step" key={i}>{s}</span>)}
      </div>
    </div>
  );
}

function ToolCall({ tool }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={`tool ${open ? "open" : ""}`}>
      <div className="tool-head" onClick={() => setOpen(!open)}>
        <span className="tool-icon"><Icon name="tool" size={11}/></span>
        <span className="tool-name">{tool.name}(</span>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
          {Object.entries(tool.args || {}).map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`).join(", ")}
        </span>
        <span className="tool-name">)</span>
        <span className={`tool-status ${tool.status}`}>
          <span className="dot"/>{tool.status === "ok" ? `ok · ${tool.elapsed}` : tool.status === "pending" ? "awaiting approval" : tool.status === "err" ? "failed" : "done"}
        </span>
        <Icon name="chevd" size={12}/>
      </div>
      <div className="tool-body">
        <div className="tool-pane">
          <div className="tool-pane-label"><span>Input</span><span>JSON</span></div>
          <pre dangerouslySetInnerHTML={{ __html: syntaxHighlight(tool.args) }}/>
        </div>
        {tool.result && (
          <div className="tool-pane">
            <div className="tool-pane-label"><span>Output</span><span>{tool.elapsed}</span></div>
            <pre>{tool.result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalCard({ approval, onDecision }) {
  const [decision, setDecision] = React.useState(null);
  if (decision) {
    return (
      <div className="tool">
        <div className="tool-head" style={{ cursor: "default" }}>
          <span className="tool-icon"><Icon name="tool" size={11}/></span>
          <span className="tool-name">{approval.tool}</span>
          <span className={`tool-status ${decision === "allow" || decision === "always" ? "ok" : "err"}`}>
            <span className="dot"/>
            {decision === "allow" ? "allowed once" : decision === "always" ? "allowed · remembered" : "denied"}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="approval">
      <div className="approval-head">
        <Icon name="bolt" size={15}/>
        <div className="approval-title">{approval.title}</div>
        <span className="smallcaps" style={{ marginLeft: "auto" }}>Permission required</span>
      </div>
      <div className="approval-sub">
        The assistant wants to call <code>{approval.tool}</code>. {approval.body}
      </div>
      {approval.preview && <div className="approval-args">{approval.preview}</div>}
      <div className="approval-actions">
        <button className="btn btn-primary" onClick={() => { setDecision("allow"); onDecision && onDecision("allow"); }}>
          <Icon name="check" size={12}/>&nbsp;Allow once
        </button>
        <button className="btn" onClick={() => { setDecision("always"); onDecision && onDecision("always"); }}>
          Allow always for <code style={{ fontFamily: "JetBrains Mono", fontSize: 11 }}>{approval.tool}</code>
        </button>
        <button className="btn btn-danger" onClick={() => { setDecision("deny"); onDecision && onDecision("deny"); }}>
          <Icon name="x" size={12}/>&nbsp;Deny
        </button>
      </div>
    </div>
  );
}

function Clarify({ data }) {
  const [chips, setChips] = React.useState(data.chips);
  const [text, setText] = React.useState("");
  const toggle = (id) => setChips(chips.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  return (
    <div className="clarify">
      <div className="clarify-q">{data.question}</div>
      <div className="chips">
        {chips.map(c => (
          <button key={c.id} className={`chip ${c.selected ? "selected" : ""}`} onClick={() => toggle(c.id)}>{c.label}</button>
        ))}
      </div>
      <div className="clarify-input">
        <span className="smallcaps">or say</span>
        <input value={text} onChange={e => setText(e.target.value)} placeholder={data.input}/>
        <button className="btn btn-primary" style={{ padding: "4px 10px" }}>Send</button>
      </div>
    </div>
  );
}

function StatusLine({ state, tool, elapsed }) {
  const label = {
    thinking: "Thinking",
    pondering: "Pondering",
    tool: `Calling ${tool}`,
    approval: "Waiting for your approval",
    streaming: "Writing",
  }[state] || "Working";
  return (
    <div className="status-line">
      <span className="status-dots"><span/><span/><span/></span>
      <span className="status-label">{label}…</span>
      <span className="status-elapsed">{elapsed}</span>
    </div>
  );
}

/* Renders a single message node */
function Message({ node, index, onEdit, onBranch }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(node.content);
  const isUser = node.role === "user";

  if (editing) {
    return (
      <div className="msg">
        <div className="msg-num">{String(index).padStart(2, "0")}</div>
        <div className="msg-body">
          <div className="msg-head">
            <span className={`msg-author ${isUser ? "user" : "asst"} serif`}>{isUser ? "You" : "Assistant"}</span>
            <span className="smallcaps" style={{ color: "var(--ochre-ink)" }}>Editing · will create a branch</span>
          </div>
          <textarea className="inline-edit" value={draft} onChange={e => setDraft(e.target.value)} autoFocus/>
          <div className="inline-edit-foot">
            <button className="btn btn-primary" onClick={() => { onEdit && onEdit(draft); setEditing(false); }}>
              <Icon name="branch" size={11}/>&nbsp;Save & branch
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <span className="smallcaps" style={{ marginLeft: "auto" }}>changes will ripple to children</span>
          </div>
        </div>
        <div className="msg-gutter"/>
      </div>
    );
  }

  return (
    <div className="msg">
      <div className="msg-num">{String(index).padStart(2, "0")}</div>
      <div className="msg-body">
        <div className="msg-head">
          <span className={`msg-author ${isUser ? "user" : "asst"} serif`}>{isUser ? "You" : "Assistant"}</span>
          <span className="msg-time mono">{node.time}</span>
          {node.branch && node.branch !== "main" && (
            <span className="msg-branch"><Icon name="branch" size={10}/> {node.branch}</span>
          )}
          <span className="msg-branch" onClick={onBranch} style={{ marginLeft: node.branch && node.branch !== "main" ? 6 : "auto" }}>
            2 branches <span className="chev">▾</span>
          </span>
        </div>

        {node.reasoning && <ReasoningBlock steps={node.reasoning} defaultOpen={index === 2}/>}

        <div className="msg-content">
          {node.content.split("\n\n").map((p, i) => {
            /* render **bold** and `code` */
            const html = p
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/`([^`]+)`/g, "<code>$1</code>");
            return <p key={i} dangerouslySetInnerHTML={{ __html: html }}/>;
          })}
        </div>

        {node.toolCall && <ToolCall tool={node.toolCall}/>}
        {node.clarify && <Clarify data={node.clarify}/>}
        {node.approval && <ApprovalCard approval={node.approval}/>}
        {node.streaming && <StatusLine state="streaming" elapsed="2.1s"/>}
      </div>
      <div className="msg-gutter">
        <button className="row-btn" onClick={() => isUser && setEditing(true)} title={isUser ? "Edit (creates branch)" : "Edit response"}>
          <Icon name="edit" size={12}/>
        </button>
        <button className="row-btn" title="Copy"><Icon name="copy" size={12}/></button>
        <button className="row-btn" onClick={onBranch} title="Branch from here"><Icon name="branch" size={12}/></button>
        <button className="row-btn" title="More"><Icon name="dots" size={12}/></button>
      </div>
      <div className="msg-margin">
        {index === 1 && "Diagnose before prescribing. Asks one clarifier; peeks at source."}
        {index === 3 && "Three moving parts: classification, full-jitter, retry budget. Requests write permission."}
        {index === 5 && "Wrote 3 files; 1.1s. Offers to run tests next."}
      </div>
    </div>
  );
}

Object.assign(window, { ReasoningBlock, ToolCall, ApprovalCard, Clarify, StatusLine, Message });
