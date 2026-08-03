import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { search } from "../api/search";
import type { SearchHit } from "../api/wire";

export interface SearchPaletteProps {
  initialQuery?: string;
  onClose: () => void;
  onOpenConversation: (id: string) => void;
}

function debounce<T extends (...args: string[]) => void>(fn: T, wait: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: string[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  }) as T;
}

function Highlight({ text }: { text: string }): JSX.Element {
  return (
    <>
      {text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} style={{ background: "var(--marker)" }}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function SearchPalette({
  initialQuery = "",
  onClose,
  onOpenConversation,
}: SearchPaletteProps): JSX.Element {
  const [query, setQuery] = useState<string>(initialQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const run = debounce((q: string) => {
      if (!q.trim()) {
        setHits([]);
        setStatus("idle");
        return;
      }
      setStatus("loading");
      setError(null);
      search(q, "all")
        .then((res) => {
          setHits(res.hits);
          setStatus("idle");
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        });
    }, 180);
    run(query);
  }, [query]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 720, width: "90vw", maxHeight: "72vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <Icon name="search" size={15} />
          <input
            ref={inputRef}
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads, messages, agents…"
            style={{ flex: 1, fontSize: 14 }}
          />
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="modal-body">
          {status === "loading" && (
            <div style={{ color: "var(--ink-3)", padding: 12 }}>Searching…</div>
          )}
          {error && <div style={{ color: "var(--crimson)", padding: 12 }}>{error}</div>}
          {!query && !hits.length && (
            <div style={{ color: "var(--ink-3)", padding: 12 }}>
              Type to search conversations, messages, and agents.
            </div>
          )}
          {hits.map((h) => (
            <div
              key={`${h.scope}:${h.id}`}
              onClick={() => {
                if (h.conversation_id) onOpenConversation(h.conversation_id);
              }}
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid var(--rule)",
                cursor: h.conversation_id ? "pointer" : "default",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span className="smallcaps" style={{ color: "var(--ink-3)" }}>
                  {h.scope}
                </span>
                <span className="serif" style={{ fontSize: 14, fontWeight: 500 }}>
                  {h.title}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
                <Highlight text={h.highlight} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
