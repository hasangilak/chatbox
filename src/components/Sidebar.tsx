import { Icon } from "./Icon";
import type { Conversation } from "../types";

export interface SidebarProps {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  activeConv: string;
  setActiveConv: (id: string) => void;
  activeTag: string;
  setActiveTag: (tag: string) => void;
  tags: string[];
  onNewChat: () => void;
  onOpenTree: () => void;
  onOpenAgents: () => void;
  onSearch?: (q: string) => void;
}

const FOLDERS = ["Pinned", "Today", "This week", "Earlier"];

export function Sidebar({
  conversations,
  loading,
  error,
  activeConv,
  setActiveConv,
  activeTag,
  setActiveTag,
  tags,
  onNewChat,
  onOpenTree,
  onOpenAgents,
  onSearch,
}: SidebarProps): JSX.Element {
  const visible = conversations.filter(
    (c) => activeTag === "all" || c.tag === activeTag,
  );

  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="side-head serif">Conversations</div>
        <button className="icon-btn" onClick={onNewChat} title="New chat">
          <Icon name="plus" size={15} />
        </button>
      </div>
      <div className="search">
        <Icon name="search" size={13} />
        <input
          placeholder="Search threads, messages, agents…"
          onChange={(e) => onSearch?.(e.target.value)}
        />
        <kbd>⌘K</kbd>
      </div>
      <div className="tag-row">
        {tags.map((t) => (
          <button
            key={t}
            className={`tag ${activeTag === t ? "active" : ""}`}
            onClick={() => setActiveTag(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="conv-list">
        {loading && conversations.length === 0 && (
          <div className="folder-head" style={{ color: "var(--ink-3)" }}>
            <span>Loading…</span>
          </div>
        )}
        {error && (
          <div
            className="folder-head"
            style={{ color: "var(--crimson)", flexDirection: "column", alignItems: "stretch" }}
          >
            <span>Cannot reach server</span>
            <span style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 2 }}>{error}</span>
          </div>
        )}
        {FOLDERS.map((f) => {
          const items = visible.filter((c) => c.folder === f);
          if (!items.length) return null;
          return (
            <div key={f}>
              <div className="folder-head">
                <span>{f}</span>
                <span className="count">{items.length}</span>
              </div>
              {items.map((c) => (
                <div
                  key={c.id}
                  className={`conv ${activeConv === c.id ? "active" : ""}`}
                  onClick={() => setActiveConv(c.id)}
                >
                  <div className="conv-title">{c.title}</div>
                  <div className="conv-meta">
                    {c.pinned && (
                      <span className="conv-pin">
                        <Icon name="pin" size={10} />
                      </span>
                    )}
                    <span>{c.updated}</span>
                  </div>
                  <div className="conv-snippet">{c.snippet}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--rule)",
          padding: "10px 12px",
          display: "flex",
          gap: 6,
        }}
      >
        <button
          className="btn btn-ghost"
          style={{
            flex: 1,
            justifyContent: "center",
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
          }}
          onClick={onOpenTree}
        >
          <Icon name="tree" size={13} /> Tree view
        </button>
        <button
          className="btn btn-ghost"
          style={{
            flex: 1,
            justifyContent: "center",
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
          }}
          onClick={onOpenAgents}
        >
          <Icon name="users" size={13} /> Agents
        </button>
      </div>
    </aside>
  );
}
