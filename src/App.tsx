import { useEffect, useMemo, useState } from "react";
import { Icon } from "./components/Icon";
import { Sidebar } from "./components/Sidebar";
import { Composer } from "./components/Composer";
import { Message, StatusLine } from "./components/message";
import { Inspector } from "./components/inspector";
import { TreeView } from "./components/TreeView";
import { AgentGallery, AgentBuilder } from "./components/agents";
import { CanvasPane } from "./components/CanvasPane";
import { TweaksPanel } from "./components/TweaksPanel";
import { useThread } from "./state/useThread";
import { useAgents, useConversations, useTags } from "./state/useWorkspace";
import { createConversation } from "./api/conversations";
import { editNode, regenerateNode } from "./api/nodes";
import type { Agent, MessageNode, TweakState } from "./types";
import type { AgentFull } from "./api/wire";

const DEFAULT_TWEAKS: TweakState = {
  theme: "light",
  layout: "atelier",
  status: "thinking",
  grain: true,
  reasonOpen: false,
  canvas: false,
  margins: true,
};

function computeLinearThread(
  activeLeaf: string,
  nodes: Record<string, MessageNode>,
): MessageNode[] {
  const chain: MessageNode[] = [];
  let cur: MessageNode | undefined = nodes[activeLeaf];
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent ? nodes[cur.parent] : undefined;
  }
  return chain;
}

type BuilderTarget = Agent | AgentFull | null;

export function App(): JSX.Element {
  const [tweaks, setTweaks] = useState<TweakState>(DEFAULT_TWEAKS);
  const [showTweaks, setShowTweaks] = useState<boolean>(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [showTree, setShowTree] = useState<boolean>(false);
  const [showAgents, setShowAgents] = useState<boolean>(false);
  const [builderAgent, setBuilderAgent] = useState<BuilderTarget | undefined>(undefined);

  const conversations = useConversations();
  const tags = useTags();
  const agents = useAgents();

  const setTweak = (patch: Partial<TweakState>) => setTweaks((s) => ({ ...s, ...patch }));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.body.style.backgroundImage = tweaks.grain ? "" : "none";
  }, [tweaks.theme, tweaks.grain]);

  // Auto-select the first conversation when the list loads.
  useEffect(() => {
    if (activeConv === null && conversations.data && conversations.data.length > 0) {
      setActiveConv(conversations.data[0].id);
    }
  }, [activeConv, conversations.data]);

  const thread = useThread(activeConv);

  const linearThread = useMemo(() => {
    if (!thread.state.tree.activeLeaf) return [] as MessageNode[];
    return computeLinearThread(thread.state.tree.activeLeaf, thread.state.tree.nodes);
  }, [thread.state.tree]);

  const agentList = ["all", ...(tags.data?.map((t) => t.name) ?? [])];

  const onNewChat = async () => {
    try {
      const created = await createConversation({});
      await conversations.reload();
      setActiveConv(created.id);
    } catch (err) {
      console.error("createConversation failed", err);
    }
  };

  const onEditNode = async (nodeId: string, content: string, ripple: boolean) => {
    await editNode(nodeId, { content, ripple });
    await thread.reload();
  };

  const onRegenerate = async (nodeId: string) => {
    await regenerateNode(nodeId);
    await thread.reload();
  };

  const activeConvMeta = useMemo(() => {
    if (!activeConv) return null;
    return conversations.data?.find((c) => c.id === activeConv) ?? null;
  }, [activeConv, conversations.data]);

  const headerTitle = thread.conversation?.title ?? activeConvMeta?.title ?? "";
  const headerAgent = thread.conversation?.agent ?? activeConvMeta?.agent ?? "Assistant";
  const enabledToolCount = 4;

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
          <span>{activeConvMeta?.folder ?? ""}</span>
          <span className="sep">/</span>
          <span className="current">{headerTitle}</span>
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
        conversations={conversations.data ?? []}
        loading={conversations.status === "loading"}
        error={conversations.error}
        activeConv={activeConv ?? ""}
        setActiveConv={setActiveConv}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        tags={agentList}
        onNewChat={() => void onNewChat()}
        onOpenTree={() => setShowTree(true)}
        onOpenAgents={() => setShowAgents(true)}
      />

      <main className="center">
        <div className="thread-head">
          <div className="thread-title serif">{headerTitle}</div>
          <div className="agent-chip">
            <span className="agent-dot">{headerAgent.slice(0, 1).toUpperCase()}</span>
            {headerAgent}
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
          {thread.status === "loading" && linearThread.length === 0 && (
            <div className="ornament" style={{ color: "var(--ink-3)" }}>
              Loading conversation…
            </div>
          )}
          {thread.status === "error" && (
            <div
              className="ornament"
              style={{ color: "var(--crimson)", flexDirection: "column" }}
            >
              {thread.error}
            </div>
          )}

          {linearThread.map((n, i) => (
            <Message
              key={n.id}
              node={n}
              index={i + 1}
              onEdit={
                n.role === "user"
                  ? (draft, opts) => onEditNode(n.id, draft, opts.ripple)
                  : () => onRegenerate(n.id)
              }
              onBranch={() => setShowTree(true)}
            />
          ))}

          {linearThread.some((n) => n.streaming) && (
            <div className="msg">
              <div className="msg-num" />
              <div className="msg-body">
                <StatusLine state={tweaks.status} tool="run_tests" elapsed="…" />
              </div>
              <div className="msg-gutter" />
            </div>
          )}

          {linearThread.length > 0 && <div className="ornament">❧ · ❦</div>}
        </div>

        <Composer
          agentName={headerAgent}
          enabledToolCount={enabledToolCount}
          onSend={(content) => thread.send(content)}
          disabled={!activeConv || thread.status !== "ready"}
        />

        {tweaks.canvas && <CanvasPane onClose={() => setTweak({ canvas: false })} />}
      </main>

      <Inspector />

      {showTree && activeConv && (
        <TreeView tree={thread.state.tree} onClose={() => setShowTree(false)} />
      )}
      {showAgents && builderAgent === undefined && (
        <AgentGallery
          agents={agents.data ?? []}
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
            void agents.reload();
          }}
        />
      )}

      {showTweaks && (
        <TweaksPanel state={tweaks} set={setTweak} onClose={() => setShowTweaks(false)} />
      )}
    </div>
  );
}
