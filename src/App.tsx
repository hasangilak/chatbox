import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "./components/Icon";
import { Sidebar } from "./components/Sidebar";
import { Composer } from "./components/Composer";
import { Message } from "./components/message";
import { Inspector } from "./components/inspector";
import { TreeView } from "./components/TreeView";
import { AgentGallery, AgentBuilder } from "./components/agents";
import { CanvasPane } from "./components/CanvasPane";
import { TweaksPanel } from "./components/TweaksPanel";
import { SearchPalette } from "./components/SearchPalette";
import { useThread } from "./state/useThread";
import { useStickToBottom } from "./state/useStickToBottom";
import { promptsForNode } from "./state/threadReducer";
import {
  useAgentFull,
  useAgents,
  useConversations,
  useTags,
  useTools,
} from "./state/useWorkspace";
import { createConversation, downloadExport, shareConversation } from "./api/conversations";
import { editNode, regenerateNode } from "./api/nodes";
import type { Agent, MessageNode, TweakState } from "./types";
import type { AgentFull } from "./api/wire";

const DEFAULT_TWEAKS: TweakState = {
  theme: "light",
  layout: "atelier",
  grain: true,
  reasonOpen: false,
  canvas: false,
  margins: true,
};

const CONVERSATION_QUERY_PARAM = "conversation";

/**
 * React's development StrictMode mounts effects twice. Keep the first bare-URL
 * creation request at module scope so opening `/` still creates exactly one
 * conversation rather than two.
 */
let bareConversationPromise: Promise<string> | null = null;

function conversationIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(CONVERSATION_QUERY_PARAM);
}

function writeConversationToUrl(id: string, mode: "push" | "replace"): void {
  const url = new URL(window.location.href);
  url.searchParams.set(CONVERSATION_QUERY_PARAM, id);
  window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", url);
}

function createBareConversation(): Promise<string> {
  if (!bareConversationPromise) {
    bareConversationPromise = createConversation({})
      .then((conversation) => conversation.id)
      .catch((error: unknown) => {
        bareConversationPromise = null;
        throw error;
      });
  }
  return bareConversationPromise;
}

/**
 * The messages actually rendered: the chain up from `activeLeaf`, plus any turn
 * still in flight below it.
 *
 * The downward half is not optional. `active_leaf.changed` fires when a turn
 * *finalizes*, so for the whole life of a turn the active leaf is still the user
 * node and the assistant node hangs off it unreferenced — walking up alone hides
 * every streaming reply, and with it any prompt parked on that node.
 *
 * Only live children are followed, never merely-newer ones, so a completed
 * sibling branch stays hidden where it belongs.
 */
function computeLinearThread(
  activeLeaf: string,
  nodes: Record<string, MessageNode>,
  isLive: (node: MessageNode) => boolean,
): MessageNode[] {
  const chain: MessageNode[] = [];
  let cur: MessageNode | undefined = nodes[activeLeaf];
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent ? nodes[cur.parent] : undefined;
  }

  const all = Object.values(nodes);
  let tail = chain[chain.length - 1];
  while (tail) {
    const live: MessageNode | undefined = all
      .filter((n) => n.parent === tail?.id && isLive(n))
      .pop();
    if (!live) break;
    chain.push(live);
    tail = live;
  }
  return chain;
}

type BuilderTarget = Agent | AgentFull | null;

export function App(): JSX.Element {
  const [tweaks, setTweaks] = useState<TweakState>(DEFAULT_TWEAKS);
  const [showTweaks, setShowTweaks] = useState<boolean>(false);
  const [activeConv, setActiveConv] = useState<string | null>(() => conversationIdFromUrl());
  const [activeTag, setActiveTag] = useState<string>("all");
  const [showTree, setShowTree] = useState<boolean>(false);
  const [showAgents, setShowAgents] = useState<boolean>(false);
  const [builderAgent, setBuilderAgent] = useState<BuilderTarget | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  // Off-canvas drawers, used only below the two-pane breakpoint. Above it the
  // sidebar and inspector are always-on grid columns and these are ignored.
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [searchSeed, setSearchSeed] = useState<string>("");
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const conversations = useConversations();
  const tags = useTags();
  const agents = useAgents();
  const tools = useTools();
  const reloadConversations = conversations.reload;

  const setTweak = (patch: Partial<TweakState>) => setTweaks((s) => ({ ...s, ...patch }));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.body.style.backgroundImage = tweaks.grain ? "" : "none";
  }, [tweaks.theme, tweaks.grain]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setShowTweaks(false);
        setNavOpen(false);
        setInspectorOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openConversation = useCallback((id: string, mode: "push" | "replace" = "push") => {
    setActiveConv(id);
    if (conversationIdFromUrl() !== id) writeConversationToUrl(id, mode);
  }, []);

  // A bare workspace is an explicit fresh start. Replace its history entry
  // with the new id so refresh restores the chat without creating another.
  useEffect(() => {
    if (conversationIdFromUrl()) return;

    let mounted = true;
    void createBareConversation()
      .then(async (id) => {
        if (!mounted) return;
        openConversation(id, "replace");
        await reloadConversations();
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        console.error("createConversation failed", error);
        setShareMsg(error instanceof Error ? error.message : String(error));
      });

    return () => {
      mounted = false;
    };
  }, [openConversation, reloadConversations]);

  useEffect(() => {
    const onPopState = () => setActiveConv(conversationIdFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const thread = useThread(activeConv);

  const pausedNodeIds = useMemo(
    () =>
      new Set(
        Object.values(thread.state.prompts)
          .filter((p) => p.response === null)
          .map((p) => p.node_id),
      ),
    [thread.state.prompts],
  );

  // `streaming` stays true across a pause, so this covers a turn parked on a
  // prompt as well as one mid-sentence — the user must be able to stop either,
  // otherwise someone who doesn't want to decide has no way out.
  const isLive = useCallback(
    (n: MessageNode) => n.streaming === true && !thread.state.cancelled[n.id],
    [thread.state.cancelled],
  );

  const linearThread = useMemo(() => {
    if (!thread.state.tree.activeLeaf) return [] as MessageNode[];
    return computeLinearThread(
      thread.state.tree.activeLeaf,
      thread.state.tree.nodes,
      isLive,
    );
  }, [thread.state.tree, isLive]);

  const turnLive = useMemo(() => linearThread.some(isLive), [linearThread, isLive]);

  /**
   * Fingerprint of everything that grows *inside* the last message rather than
   * adding one: streamed text, reasoning, a tool result landing, a prompt or
   * interjection attaching. Changes to this pin the scroll instantly; a change
   * in message count animates instead. See `useStickToBottom`.
   */
  const growthSignature = useMemo(() => {
    const tail = linearThread[linearThread.length - 1];
    if (!tail) return 0;
    const reasoning = tail.reasoning?.join("").length ?? 0;
    const tool = tail.toolCall ? JSON.stringify(tail.toolCall).length : 0;
    const prompts = promptsForNode(thread.state, tail.id).length;
    const interjections = thread.state.interjections[tail.id]?.length ?? 0;
    return tail.content.length + reasoning + tool + prompts * 7919 + interjections * 104729;
  }, [linearThread, thread.state]);

  const stick = useStickToBottom({
    itemCount: linearThread.length,
    growthSignature,
    resetKey: activeConv,
  });

  const agentList = ["all", ...(tags.data?.map((t) => t.name) ?? [])];

  const onNewChat = async () => {
    try {
      const created = await createConversation({});
      await conversations.reload();
      openConversation(created.id);
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

  const onShare = async () => {
    if (!activeConv) return;
    try {
      const res = await shareConversation(activeConv);
      await navigator.clipboard.writeText(res.public_url).catch(() => undefined);
      setShareMsg(`Share URL copied: ${res.public_url}`);
      setTimeout(() => setShareMsg(null), 4000);
    } catch (err) {
      setShareMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => setShareMsg(null), 4000);
    }
  };

  const onExport = async (format: "md" | "json") => {
    if (!activeConv) return;
    try {
      const blob = await downloadExport(activeConv, format);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${activeConv}.${format}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 0);
    } catch (err) {
      setShareMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => setShareMsg(null), 4000);
    }
  };

  const activeConvMeta = useMemo(() => {
    if (!activeConv) return null;
    return conversations.data?.find((c) => c.id === activeConv) ?? null;
  }, [activeConv, conversations.data]);

  // The live title event updates the header through useThread. Mirror it into
  // the workspace listing so the sidebar changes without waiting for another
  // navigation or manual refresh.
  useEffect(() => {
    const liveTitle = thread.conversation?.title;
    if (!liveTitle || !activeConvMeta || liveTitle === activeConvMeta.title) return;
    void reloadConversations();
  }, [activeConvMeta, reloadConversations, thread.conversation?.title]);

  const headerTitle = thread.conversation?.title ?? activeConvMeta?.title ?? "";
  const headerAgent = thread.conversation?.agent ?? activeConvMeta?.agent ?? "Assistant";
  const activeAgentMeta = agents.data?.find((agent) => agent.name === headerAgent) ?? null;
  const activeAgent = useAgentFull(activeAgentMeta?.id ?? null);
  const enabledToolIds = useMemo(() => {
    const ids = new Set(["web_search", ...(activeAgent.data?.tool_ids ?? [])]);
    return [...ids].filter(
      (id) => id === "web_search" || tools.data?.some((tool) => tool.id === id && tool.enabled),
    );
  }, [activeAgent.data?.tool_ids, tools.data]);
  const threadError = thread.state.lastError;
  const lastAsstNode = useMemo(
    () => [...linearThread].reverse().find((n) => n.role === "asst") ?? null,
    [linearThread],
  );

  return (
    <div
      className={`app layout-${tweaks.layout} ${tweaks.canvas ? "canvas-open" : ""}`}
      data-screen-label="Main · Workbench"
      data-nav-open={navOpen ? "true" : "false"}
      data-inspector-open={inspectorOpen ? "true" : "false"}
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
          {/* Shown only once the panes collapse — see the responsive section
              in styles.css. Without these, a narrow viewport has no way to
              reach the conversation list at all. */}
          <button
            className="icon-btn narrow-only"
            onClick={() => setNavOpen((v) => !v)}
            title="Conversations"
            aria-label="Toggle conversations"
            aria-expanded={navOpen}
          >
            <Icon name="folder" size={14} />
          </button>
          <button
            className="icon-btn narrow-only"
            onClick={() => setInspectorOpen((v) => !v)}
            title="Inspector"
            aria-label="Toggle inspector"
            aria-expanded={inspectorOpen}
          >
            <Icon name="clock" size={14} />
          </button>
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
          <button className="icon-btn" onClick={() => setShowAgents(true)} title="Agents">
            <Icon name="users" size={14} />
          </button>
          <button className="icon-btn" onClick={() => setShowTree(true)} title="Message tree">
            <Icon name="tree" size={14} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setTweak({ theme: tweaks.theme === "light" ? "dark" : "light" })}
            title="Theme"
          >
            <Icon name={tweaks.theme === "light" ? "moon" : "sun"} size={14} />
          </button>
          <button className="icon-btn" onClick={() => setShowTweaks((s) => !s)} title="Tweaks">
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
        setActiveConv={(id) => {
          openConversation(id);
          setNavOpen(false);
        }}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        tags={agentList}
        onNewChat={() => void onNewChat()}
        onOpenTree={() => setShowTree(true)}
        onOpenAgents={() => setShowAgents(true)}
        onSearch={(q) => {
          setSearchSeed(q);
          if (q) setSearchOpen(true);
        }}
      />

      <main className="center">
        <div className="thread-head">
          <div className="thread-title serif">{headerTitle}</div>
          <div className="agent-chip">
            <span className="agent-dot">{headerAgent.slice(0, 1).toUpperCase()}</span>
            {headerAgent}
          </div>
          <div className="thread-actions">
            <button
              className="icon-btn"
              title="Share"
              onClick={() => void onShare()}
              disabled={!activeConv}
            >
              <Icon name="share" size={13} />
            </button>
            <button
              className="icon-btn"
              title="Export markdown"
              onClick={() => onExport("md")}
              disabled={!activeConv}
            >
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

        {shareMsg && (
          <div
            style={{
              margin: "6px 22px",
              padding: "6px 10px",
              background: "var(--sage-wash)",
              border: "1px solid var(--sage)",
              borderRadius: 2,
              fontSize: 12,
            }}
          >
            {shareMsg}
          </div>
        )}

        {/* tabIndex makes the thread focusable so PageUp/Home reach the
            keydown listener in useStickToBottom, not just the body. */}
        <div className="thread" ref={stick.scrollRef} tabIndex={-1}>
          <div className="thread-inner" ref={stick.contentRef}>
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
                prompts={promptsForNode(thread.state, n.id)}
                interjections={thread.state.interjections[n.id]}
                cancellation={thread.state.cancelled[n.id]}
                onRespond={thread.respond}
                onEdit={
                  n.role === "user"
                    ? (draft, opts) => onEditNode(n.id, draft, opts.ripple)
                    : () => onRegenerate(n.id)
                }
                onBranch={() => setShowTree(true)}
              />
            ))}

            {threadError && (
              <div className={`turn-error ${threadError.recoverable ? "" : "fatal"}`}>
                <Icon name="bolt" size={12} />
                <span>{threadError.message}</span>
                {threadError.interruptedByRestart && lastAsstNode && (
                  <button className="btn btn-sm" onClick={() => void onRegenerate(lastAsstNode.id)}>
                    Regenerate
                  </button>
                )}
              </div>
            )}

            {linearThread.length > 0 && <div className="ornament">❧ · ❦</div>}
          </div>
        </div>

        <Composer
          agentName={headerAgent}
          tools={tools.data ?? []}
          enabledToolIds={enabledToolIds}
          /* Only offered once we've actually stopped following, so it never
             appears while the thread is already carrying the user down. */
          jumpToLatest={
            stick.hasUnseenBelow ? (
              <button
                className="jump-latest"
                onClick={() => stick.followNow()}
                title="Jump to latest"
              >
                <Icon name="chevd" size={12} />
                {turnLive ? "Jump to latest — still writing" : "Jump to latest"}
              </button>
            ) : undefined
          }
          onSend={(content) => {
            // Sending is an explicit request to see what comes back, so it
            // re-arms following even if the user had scrolled away.
            stick.followNow();
            return thread.send(content);
          }}
          onStop={thread.stop}
          onSteer={(text) => {
            stick.followNow();
            return thread.steer(text);
          }}
          live={turnLive}
          disabled={!activeConv || thread.status !== "ready"}
        />

        {tweaks.canvas && (
          <CanvasPane
            conversationId={activeConv}
            bumpKey={thread.state.artifactBumpKey}
            onClose={() => setTweak({ canvas: false })}
          />
        )}
      </main>

      {/* One scrim for both drawers; CSS keeps it out of the way above the
          breakpoint where nothing is off-canvas. */}
      {(navOpen || inspectorOpen) && (
        <button
          className="drawer-scrim"
          aria-label="Close panel"
          onClick={() => {
            setNavOpen(false);
            setInspectorOpen(false);
          }}
        />
      )}

      <Inspector
        conversationId={activeConv}
        agentName={headerAgent}
        availableTags={tags.data ?? []}
        attachedTags={thread.conversation?.tags ?? activeConvMeta?.tags ?? []}
        onTagsChanged={async () => {
          await Promise.all([
            thread.reload(),
            conversations.reload(),
            tags.reload(),
          ]);
        }}
      />

      {showTree && activeConv && (
        <TreeView
          tree={thread.state.tree}
          pausedNodeIds={pausedNodeIds}
          onChanged={async () => {
            await Promise.all([thread.reload(), conversations.reload()]);
          }}
          onClose={() => setShowTree(false)}
        />
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

      {searchOpen && (
        <SearchPalette
          initialQuery={searchSeed}
          onClose={() => setSearchOpen(false)}
          onOpenConversation={(id) => {
            openConversation(id);
            setSearchOpen(false);
          }}
        />
      )}
    </div>
  );
}
