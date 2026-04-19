import { useEffect, useMemo, useState } from "react";
import { Icon } from "./components/Icon";
import { Sidebar } from "./components/Sidebar";
import { Message, StatusLine } from "./components/message";
import { Inspector } from "./components/inspector";
import { TreeView } from "./components/TreeView";
import { AgentGallery, AgentBuilder } from "./components/agents";
import { CanvasPane } from "./components/CanvasPane";
import { TweaksPanel } from "./components/TweaksPanel";
import { SAMPLE_TREE } from "./data/sample";
import type { Agent, MessageNode, TweakState } from "./types";

const DEFAULT_TWEAKS: TweakState = {
  theme: "light",
  layout: "atelier",
  status: "thinking",
  grain: true,
  reasonOpen: false,
  canvas: false,
  margins: true,
};

function computeLinearThread(activeLeaf: string, nodes: Record<string, MessageNode>): MessageNode[] {
  const chain: MessageNode[] = [];
  let cur: MessageNode | undefined = nodes[activeLeaf];
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent ? nodes[cur.parent] : undefined;
  }
  return chain;
}

export function App(): JSX.Element {
  const [tweaks, setTweaks] = useState<TweakState>(DEFAULT_TWEAKS);
  const [showTweaks, setShowTweaks] = useState<boolean>(false);
  const [activeConv, setActiveConv] = useState<string>("c-01");
  const [activeTag, setActiveTag] = useState<string>("all");
  const [showTree, setShowTree] = useState<boolean>(false);
  const [showAgents, setShowAgents] = useState<boolean>(false);
  const [builderAgent, setBuilderAgent] = useState<Agent | null | undefined>(undefined);

  const setTweak = (patch: Partial<TweakState>) => setTweaks((s) => ({ ...s, ...patch }));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.body.style.backgroundImage = tweaks.grain ? "" : "none";
  }, [tweaks.theme, tweaks.grain]);

  const tree = SAMPLE_TREE;
  const linearThread = useMemo(
    () => computeLinearThread(tree.activeLeaf, tree.nodes),
    [tree.activeLeaf, tree.nodes],
  );

  void activeConv;

  return (
    <div
      className={`app layout-${tweaks.layout} ${tweaks.canvas ? "canvas-open" : ""}`}
      data-screen-label="Main · Workbench"
    >
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span className="brand-title serif">Workbench</span>
          <span className="brand-sub">LLM studio</span>
        </div>
        <div className="topbar-sep" />
        <div className="crumb">
          <span>Workspace</span>
          <span className="sep">/</span>
          <span>Pinned</span>
          <span className="sep">/</span>
          <span className="current">Retry policy refactor</span>
        </div>
        <div className="topbar-right">
          <div className="layout-switch" title="Layout">
            <button
              className={tweaks.layout === "atelier" ? "active" : ""}
              onClick={() => setTweak({ layout: "atelier" })}
            >
              Atelier
            </button>
            <button
              className={tweaks.layout === "ledger" ? "active" : ""}
              onClick={() => setTweak({ layout: "ledger" })}
            >
              Ledger
            </button>
            <button
              className={tweaks.layout === "workshop" ? "active" : ""}
              onClick={() => setTweak({ layout: "workshop" })}
            >
              Workshop
            </button>
          </div>
          <button
            className="icon-btn"
            onClick={() => setTweak({ canvas: !tweaks.canvas })}
            title="Canvas"
          >
            <Icon name="canvas" size={14} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowAgents(true)}
            title="Agents"
          >
            <Icon name="users" size={14} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowTree(true)}
            title="Message tree"
          >
            <Icon name="tree" size={14} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setTweak({ theme: tweaks.theme === "light" ? "dark" : "light" })}
            title="Theme"
          >
            <Icon name={tweaks.theme === "light" ? "moon" : "sun"} size={14} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowTweaks((s) => !s)}
            title="Tweaks"
          >
            <Icon name="sliders" size={14} />
          </button>
          <div
            style={{
              marginLeft: 6,
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "var(--ochre-wash)",
              color: "var(--ochre-ink)",
              display: "grid",
              placeItems: "center",
              fontFamily: "Fraunces, serif",
              fontWeight: 500,
              border: "1px solid var(--rule)",
            }}
          >
            A
          </div>
        </div>
      </header>

      <Sidebar
        activeConv={activeConv}
        setActiveConv={setActiveConv}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        onNewChat={() => setActiveConv("new")}
        onOpenTree={() => setShowTree(true)}
        onOpenAgents={() => setShowAgents(true)}
      />

      <main className="center">
        <div className="thread-head">
          <div className="thread-title serif">Refactoring the retry policy in orders-service</div>
          <div className="agent-chip">
            <span className="agent-dot">C</span>
            Code Reviewer
            <span className="pill mono">claude-sonnet-4.5</span>
          </div>
          <div className="thread-actions">
            <button className="icon-btn" title="Share">
              <Icon name="share" size={13} />
            </button>
            <button className="icon-btn" title="Export">
              <Icon name="export" size={13} />
            </button>
            <button className="icon-btn" title="Pin">
              <Icon name="pin" size={13} />
            </button>
            <button className="icon-btn" title="More">
              <Icon name="dots" size={13} />
            </button>
          </div>
        </div>

        <div className="thread">
          {linearThread.map((n, i) => (
            <Message
              key={n.id}
              node={n}
              index={i + 1}
              onBranch={() => setShowTree(true)}
            />
          ))}

          <div className="msg">
            <div className="msg-num" />
            <div className="msg-body">
              <StatusLine state={tweaks.status} tool="run_tests" elapsed="3.8s" />
            </div>
            <div className="msg-gutter" />
          </div>

          <div className="ornament">❧ · ❦</div>
        </div>

        <div className="composer-wrap">
          <div className="composer">
            <div className="composer-top">
              <span className="composer-chip selected">
                <Icon name="users" size={10} /> Code Reviewer
              </span>
              <span className="composer-chip">
                <Icon name="tool" size={10} /> 4 tools
              </span>
              <span className="composer-chip">
                <Icon name="attach" size={10} /> repo: orders-service
              </span>
              <span className="composer-chip">
                <Icon name="brain" size={10} /> reasoning · high
              </span>
              <span style={{ flex: 1 }} />
              <span className="smallcaps" style={{ color: "var(--ink-4)" }}>
                8 132 / 200k tokens
              </span>
            </div>
            <textarea placeholder="Ask Code Reviewer… ( / for commands · @ for agents · # for files )" />
            <div className="composer-foot">
              <button className="icon-btn">
                <Icon name="attach" size={13} />
              </button>
              <button className="icon-btn">
                <Icon name="tool" size={13} />
              </button>
              <button className="icon-btn">
                <Icon name="brain" size={13} />
              </button>
              <div className="spacer" />
              <span className="smallcaps" style={{ color: "var(--ink-4)" }}>
                shift-return for newline
              </span>
              <button className="send-btn">
                Send <kbd>↵</kbd>
              </button>
            </div>
          </div>
        </div>

        {tweaks.canvas && <CanvasPane onClose={() => setTweak({ canvas: false })} />}
      </main>

      <Inspector />

      {showTree && <TreeView onClose={() => setShowTree(false)} />}
      {showAgents && builderAgent === undefined && (
        <AgentGallery
          onClose={() => setShowAgents(false)}
          onOpenBuilder={(a) => setBuilderAgent(a)}
        />
      )}
      {builderAgent !== undefined && (
        <AgentBuilder
          agent={builderAgent}
          onClose={() => {
            setBuilderAgent(undefined);
            setShowAgents(false);
          }}
        />
      )}

      {showTweaks && (
        <TweaksPanel state={tweaks} set={setTweak} onClose={() => setShowTweaks(false)} />
      )}
    </div>
  );
}
