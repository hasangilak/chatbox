import { useEffect, useState } from "react";
import {
  deletePinnedSnippet,
  getNote,
  listPinnedSnippets,
  putNote,
} from "../../api/conversations";
import { Icon } from "../Icon";
import type { PinnedSnippet } from "../../api/wire";

export interface NotesPanelProps {
  conversationId: string | null;
}

export function NotesPanel({ conversationId }: NotesPanelProps): JSX.Element {
  const [body, setBody] = useState<string>("");
  const [snippets, setSnippets] = useState<PinnedSnippet[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setStatus("loading");
    setError(null);
    Promise.all([getNote(conversationId), listPinnedSnippets(conversationId)])
      .then(([note, pins]) => {
        if (cancelled) return;
        setBody(note.body ?? "");
        setSnippets(pins);
        setStatus("idle");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const save = async () => {
    if (!conversationId) return;
    setStatus("saving");
    setError(null);
    try {
      await putNote(conversationId, body);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const removePin = async (id: string) => {
    try {
      await deletePinnedSnippet(id);
      setSnippets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!conversationId) {
    return (
      <div style={{ padding: "16px 18px", color: "var(--ink-3)" }}>
        Open a conversation to take notes.
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 18px" }}>
      <div className="field">
        <div className="field-label">
          <span>Thread notes</span>
          <span>{status === "saving" ? "saving…" : "saved"}</span>
        </div>
        <textarea
          className="textarea prompt"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => void save()}
        />
        {error && (
          <div style={{ color: "var(--crimson)", fontSize: 11.5, marginTop: 4 }}>{error}</div>
        )}
      </div>
      <div className="field">
        <div className="field-label">
          <span>Pinned snippets</span>
          <span>{snippets.length}</span>
        </div>
        {snippets.length === 0 && (
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            No pins yet — highlight a message and pin it to collect it here.
          </div>
        )}
        {snippets.map((s) => (
          <div
            key={s.id}
            style={{
              border: "1px solid var(--rule)",
              borderRadius: 3,
              padding: 10,
              marginBottom: 8,
              background: "var(--paper-2)",
              position: "relative",
            }}
          >
            <div className="smallcaps">{s.label}</div>
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 13,
                fontStyle: "italic",
                color: "var(--ink-2)",
              }}
            >
              {s.excerpt}
            </div>
            <button
              className="icon-btn"
              style={{ position: "absolute", top: 6, right: 6 }}
              onClick={() => void removePin(s.id)}
              title="Remove pin"
            >
              <Icon name="x" size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
