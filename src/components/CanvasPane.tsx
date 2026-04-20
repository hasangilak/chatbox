import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { syntaxHighlight } from "../utils/syntaxHighlight";
import {
  diffArtifact,
  getArtifact,
  listArtifactVersions,
  listConversationArtifacts,
} from "../api/artifacts";
import type {
  Artifact,
  ArtifactDetail,
  ArtifactDiffResponse,
  ArtifactVersion,
} from "../api/wire";

export interface CanvasPaneProps {
  conversationId: string | null;
  onClose: () => void;
  /** Event bump to re-fetch artifacts when `artifact.updated` fires. */
  bumpKey?: number;
}

type CanvasTab = "preview" | "diff" | "history";

export function CanvasPane({
  conversationId,
  onClose,
  bumpKey = 0,
}: CanvasPaneProps): JSX.Element {
  const [tab, setTab] = useState<CanvasTab>("preview");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ArtifactDetail | null>(null);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [diff, setDiff] = useState<ArtifactDiffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!conversationId) {
      setArtifacts([]);
      setActiveId(null);
      return;
    }
    let cancelled = false;
    listConversationArtifacts(conversationId)
      .then((list) => {
        if (cancelled) return;
        setArtifacts(list);
        setActiveId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, bumpKey]);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      setVersions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getArtifact(activeId), listArtifactVersions(activeId)])
      .then(([d, vs]) => {
        if (cancelled) return;
        setDetail(d);
        setVersions(vs);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, bumpKey]);

  useEffect(() => {
    if (tab !== "diff" || !activeId || versions.length < 2) {
      setDiff(null);
      return;
    }
    let cancelled = false;
    const from = versions[1]?.version;
    const to = versions[0]?.version;
    if (!from || !to) return;
    diffArtifact(activeId, from, to)
      .then((d) => {
        if (!cancelled) setDiff(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [tab, activeId, versions]);

  const currentContent = useMemo(() => detail?.current_version?.content ?? "", [detail]);

  return (
    <div className="canvas-pane">
      <div className="canvas-head">
        <Icon name="paper" size={15} />
        <select
          className="select"
          value={activeId ?? ""}
          onChange={(e) => setActiveId(e.target.value || null)}
          style={{ maxWidth: 220 }}
        >
          {!artifacts.length && <option value="">no artifacts</option>}
          {artifacts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <span className="smallcaps">
          {detail?.current_version ? `v${detail.current_version.version}` : "artifact"}
        </span>
        <div className="canvas-tabs">
          <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
            Preview
          </button>
          <button className={tab === "diff" ? "active" : ""} onClick={() => setTab("diff")}>
            Diff
          </button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
            History
          </button>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <Icon name="x" size={13} />
        </button>
      </div>
      <div className="canvas-body">
        {error && <div style={{ color: "var(--crimson)" }}>{error}</div>}
        {loading && !detail && <div style={{ color: "var(--ink-3)" }}>Loading artifact…</div>}
        {!activeId && !loading && !artifacts.length && (
          <div style={{ color: "var(--ink-3)" }}>
            This conversation has no artifacts yet. The <code>write_file</code> tool creates one
            when approved.
          </div>
        )}

        {tab === "preview" && currentContent && (
          <pre
            style={{ margin: 0, whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(currentContent) }}
          />
        )}

        {tab === "diff" && (
          <>
            {versions.length < 2 && (
              <div style={{ color: "var(--ink-3)" }}>Need at least two versions to diff.</div>
            )}
            {diff && (
              <pre
                style={{
                  margin: 0,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {diff.unified}
              </pre>
            )}
          </>
        )}

        {tab === "history" && (
          <div style={{ fontFamily: "IBM Plex Sans" }}>
            {versions.map((h) => (
              <div
                key={h.id}
                style={{
                  border: "1px solid var(--rule)",
                  padding: 10,
                  marginBottom: 8,
                  borderRadius: 3,
                  background: "var(--paper)",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span className="serif" style={{ fontSize: 14, fontWeight: 500 }}>
                    v{h.version}
                  </span>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                    {new Date(h.created_at).toLocaleString()} · {h.author}
                  </span>
                </div>
                <div
                  className="serif"
                  style={{
                    fontSize: 12.5,
                    fontStyle: "italic",
                    color: "var(--ink-2)",
                    marginTop: 2,
                  }}
                >
                  {h.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
