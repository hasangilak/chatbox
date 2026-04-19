import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { syntaxHighlight } from "../utils/syntaxHighlight";
import { SAMPLE_TREE } from "../data/sample";
import type { MessageNode } from "../types";

export interface TreeViewProps {
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

const COL = 240;
const ROW = 96;
const PADX = 40;
const PADY = 32;

function buildLayout(nodes: Record<string, MessageNode>): {
  pos: Record<string, Point>;
  branchRows: Record<string, number>;
  width: number;
  height: number;
  depthCount: number;
} {
  const nodeList = Object.values(nodes);

  const depthOf = (id: string, d = 0): number => {
    const n = nodes[id];
    if (!n || !n.parent) return d;
    return depthOf(n.parent, d + 1);
  };

  const depths = new Set<number>();
  nodeList.forEach((n) => depths.add(depthOf(n.id)));

  const branchRows: Record<string, number> = { main: 0 };
  let nextRow = 1;
  nodeList.forEach((n) => {
    if (!(n.branch in branchRows)) {
      branchRows[n.branch] = nextRow++;
    }
  });

  const pos: Record<string, Point> = {};
  nodeList.forEach((n) => {
    const d = depthOf(n.id);
    const r = branchRows[n.branch];
    pos[n.id] = { x: PADX + d * COL, y: PADY + r * ROW };
  });

  const width = PADX * 2 + depths.size * COL;
  const height = PADY * 2 + Object.keys(branchRows).length * ROW;
  return { pos, branchRows, width, height, depthCount: depths.size };
}

export function TreeView({ onClose }: TreeViewProps): JSX.Element {
  const tree = SAMPLE_TREE;
  const [activeId, setActiveId] = useState<string>("n-04");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ripple, setRipple] = useState<boolean>(true);

  const nodes = tree.nodes;
  const active = nodes[activeId];
  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const layout = useMemo(() => buildLayout(nodes), [nodes]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 1180, width: "95vw", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <Icon name="tree" size={18} />
          <div className="title">
            Message tree{" "}
            <span className="smallcaps" style={{ fontWeight: 500, marginLeft: 8 }}>
              Retry policy refactor
            </span>
          </div>
          <div className="tree-legend" style={{ padding: 0 }}>
            <span>
              <span className="sw" style={{ borderLeft: "3px solid var(--ink)" }} /> user
            </span>
            <span>
              <span className="sw" style={{ borderLeft: "3px solid var(--ochre)" }} /> assistant
            </span>
            <span>
              <span className="sw" style={{ background: "var(--marker)" }} /> edited
            </span>
            <span>
              <span className="sw" style={{ background: "var(--paper-2)" }} /> alt branch
            </span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div
          className="tree-toolbar"
          style={{
            padding: "10px 22px",
            marginBottom: 0,
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <span className="smallcaps">{Object.keys(nodes).length} nodes · 2 branches</span>
          <div className="spacer" />
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--ink-2)",
            }}
          >
            <div className={`toggle ${ripple ? "on" : ""}`} onClick={() => setRipple(!ripple)} />
            Ripple edits downstream
          </label>
          <button
            className="btn btn-ghost"
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <Icon name="export" size={11} /> Export
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              overflow: "auto",
              background: "var(--paper-2)",
              position: "relative",
            }}
          >
            <div style={{ position: "relative", width: layout.width, height: layout.height }}>
              <svg
                style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                width={layout.width}
                height={layout.height}
              >
                {nodeList
                  .filter((n) => n.parent)
                  .map((n) => {
                    const p = layout.pos[n.parent as string];
                    const c = layout.pos[n.id];
                    const isBranchEdge = nodes[n.parent as string].branch !== n.branch;
                    const x1 = p.x + 200;
                    const y1 = p.y + 40;
                    const x2 = c.x;
                    const y2 = c.y + 40;
                    const cx = (x1 + x2) / 2;
                    return (
                      <path
                        key={n.id}
                        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                        stroke={isBranchEdge ? "var(--ochre)" : "var(--rule-strong)"}
                        strokeWidth={isBranchEdge ? 1.5 : 1}
                        strokeDasharray={isBranchEdge ? "4 3" : ""}
                        fill="none"
                      />
                    );
                  })}
              </svg>

              {nodeList.map((n) => {
                const p = layout.pos[n.id];
                const cls = [
                  "node",
                  n.role,
                  activeId === n.id ? "active" : "",
                  n.branch !== "main" ? "branch-alt" : "",
                  n.edited ? "edited" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    key={n.id}
                    className={cls}
                    style={{ position: "absolute", left: p.x, top: p.y, width: 200 }}
                    onClick={() => setActiveId(n.id)}
                  >
                    <div className="n-role">
                      {n.role === "user" ? "You" : "Assistant"}
                      <span
                        style={{
                          float: "right",
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 500,
                          color: "var(--ink-4)",
                        }}
                      >
                        {n.time}
                      </span>
                    </div>
                    <div className="n-text">
                      {n.content.slice(0, 120)}
                      {n.content.length > 120 ? "…" : ""}
                    </div>
                    {n.reasoning && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--ink-4)",
                        }}
                      >
                        · {n.reasoning.length} thoughts
                      </div>
                    )}
                    {n.toolCall && (
                      <div
                        style={{
                          marginTop: 2,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          color: "var(--sage)",
                        }}
                      >
                        → {n.toolCall.name}
                      </div>
                    )}
                    {n.approval && (
                      <div
                        style={{
                          marginTop: 2,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          color: "var(--ochre-ink)",
                        }}
                      >
                        ⚡ approval
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.entries(layout.branchRows).map(([b, r]) => (
                <div
                  key={b}
                  style={{
                    position: "absolute",
                    left: 8,
                    top: PADY + r * ROW + 34,
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--ink-3)",
                    fontWeight: 600,
                    transform: "rotate(-90deg)",
                    transformOrigin: "left top",
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderLeft: "1px solid var(--rule)",
              overflowY: "auto",
              background: "var(--paper)",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div className="smallcaps">
                {active.role === "user" ? "Your message" : "Assistant message"} · {active.branch}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  fontFamily: "JetBrains Mono, monospace",
                  marginTop: 2,
                }}
              >
                {active.id} · {active.time}
              </div>
            </div>

            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div className="field-label">
                <span>Content</span>
                {editingId !== active.id && (
                  <button
                    className="btn btn-ghost"
                    style={{
                      padding: 0,
                      fontSize: 10,
                      display: "inline-flex",
                      gap: 4,
                      alignItems: "center",
                    }}
                    onClick={() => setEditingId(active.id)}
                  >
                    <Icon name="edit" size={10} /> EDIT
                  </button>
                )}
              </div>
              {editingId === active.id ? (
                <div>
                  <textarea className="textarea prompt" defaultValue={active.content} />
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                      alignItems: "center",
                    }}
                  >
                    <button className="btn btn-primary" onClick={() => setEditingId(null)}>
                      <Icon name="branch" size={11} />
                      &nbsp;Save & branch
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <span className="smallcaps" style={{ marginLeft: "auto" }}>
                      {ripple ? "ripple on" : "ripple off"}
                    </span>
                  </div>
                  {ripple && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background: "var(--ochre-wash)",
                        border: "1px solid var(--ochre)",
                        borderRadius: 2,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>Ripple preview</div>
                      <div style={{ color: "var(--ink-2)", marginTop: 3 }}>
                        3 descendant nodes will be re-generated. Tool calls and approvals will be
                        requested again.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="serif"
                  style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}
                >
                  {active.content}
                </div>
              )}
            </div>

            {active.reasoning && (
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div className="field-label">
                  <span>Reasoning</span>
                  {editingId !== active.id + "-r" && (
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: 0,
                        fontSize: 10,
                        display: "inline-flex",
                        gap: 4,
                        alignItems: "center",
                      }}
                      onClick={() => setEditingId(active.id + "-r")}
                    >
                      <Icon name="edit" size={10} /> TAMPER
                    </button>
                  )}
                </div>
                {active.reasoning.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "Fraunces, serif",
                      fontStyle: "italic",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "var(--ink-2)",
                      padding: "4px 0",
                      borderBottom:
                        i < (active.reasoning?.length ?? 0) - 1 ? "1px dashed var(--rule)" : "none",
                    }}
                  >
                    <span style={{ color: "var(--ink-4)", marginRight: 6 }}>›</span>
                    {r}
                  </div>
                ))}
              </div>
            )}

            {active.toolCall && (
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div className="field-label">
                  <span>Tool call</span>
                </div>
                <div className="mono" style={{ fontSize: 12, marginBottom: 4 }}>
                  {active.toolCall.name}
                </div>
                <pre
                  className="mono"
                  style={{
                    fontSize: 11,
                    background: "var(--paper-2)",
                    padding: 8,
                    border: "1px solid var(--rule)",
                    borderRadius: 2,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: syntaxHighlight(active.toolCall.args),
                  }}
                />
              </div>
            )}

            <div style={{ padding: "14px 18px" }}>
              <div className="field-label">
                <span>Actions</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  className="btn"
                  style={{
                    textAlign: "left",
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Icon name="branch" size={12} /> Branch from this node
                </button>
                <button
                  className="btn"
                  style={{
                    textAlign: "left",
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Icon name="play" size={11} /> Regenerate from here
                </button>
                <button
                  className="btn"
                  style={{
                    textAlign: "left",
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Icon name="canvasArrow" size={12} /> Jump to message
                </button>
                <button
                  className="btn btn-danger"
                  style={{
                    textAlign: "left",
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Icon name="x" size={12} /> Prune subtree
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
