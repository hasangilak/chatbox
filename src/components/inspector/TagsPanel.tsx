import { useMemo, useState, type FormEvent } from "react";
import { attachTag, detachTag } from "../../api/conversations";
import { createTag } from "../../api/tags";
import type { Tag } from "../../api/wire";

export interface TagsPanelProps {
  conversationId: string | null;
  availableTags: Tag[];
  attachedTags: Tag[];
  onChanged: () => Promise<void> | void;
}

export function TagsPanel({
  conversationId,
  availableTags,
  attachedTags,
  onChanged,
}: TagsPanelProps): JSX.Element {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attachedIds = useMemo(
    () => new Set(attachedTags.map((tag) => tag.id)),
    [attachedTags],
  );

  const toggle = async (tag: Tag) => {
    if (!conversationId || busy) return;
    setBusy(tag.id);
    setError(null);
    try {
      if (attachedIds.has(tag.id)) {
        await detachTag(conversationId, tag.id);
      } else {
        await attachTag(conversationId, { tag_id: tag.id });
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const createAndAttach = async (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!conversationId || !name || busy) return;
    setBusy("new");
    setError(null);
    try {
      const tag = await createTag({ name });
      await attachTag(conversationId, { tag_id: tag.id });
      setDraft("");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  if (!conversationId) {
    return (
      <div style={{ padding: "16px 18px", color: "var(--ink-3)" }}>
        Open a conversation to manage tags.
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 18px" }}>
      <div className="field">
        <div className="field-label">
          <span>Conversation tags</span>
          <span>{attachedIds.size} attached</span>
        </div>
        {availableTags.length === 0 && (
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 8 }}>
            No workspace tags yet. Create the first one below.
          </div>
        )}
        {availableTags.map((tag) => {
          const attached = attachedIds.has(tag.id);
          return (
            <div key={tag.id} className="toggle-row">
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: tag.color ?? "var(--ink-4)",
                  }}
                />
                <span style={{ fontSize: 12.5 }}>{tag.name}</span>
              </div>
              <button
                type="button"
                className={`toggle ${attached ? "on" : ""}`}
                onClick={() => void toggle(tag)}
                disabled={busy !== null}
                aria-label={`${attached ? "Detach" : "Attach"} ${tag.name}`}
              />
            </div>
          );
        })}
      </div>

      <form className="field" onSubmit={(event) => void createAndAttach(event)}>
        <div className="field-label">
          <span>Create and attach</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tag name"
            disabled={busy !== null}
          />
          <button
            type="submit"
            className="btn"
            disabled={busy !== null || draft.trim().length === 0}
          >
            {busy === "new" ? "Adding…" : "Add"}
          </button>
        </div>
        {error && (
          <div style={{ color: "var(--crimson)", fontSize: 11.5, marginTop: 6 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
