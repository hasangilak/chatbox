import { useState } from "react";
import { Icon } from "./Icon";
import { syntaxHighlight } from "../utils/syntaxHighlight";

export interface CanvasPaneProps {
  onClose: () => void;
}

type CanvasTab = "preview" | "diff" | "history";

const SAMPLE_CODE = `export interface RetryOptions {
  deadlineMs: number;
  baseMs?: number;
  capMs?: number;
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

const bucket = new TokenBucket({ capacity: 100, refillPerSec: 10 });

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const deadline = Date.now() + opts.deadlineMs;
  const base = opts.baseMs ?? 100;
  const cap  = opts.capMs  ?? 10_000;

  const parent = tracer.startSpan("retry.call", {
    attributes: { "retry.deadline_ms": opts.deadlineMs }
  });

  let attempt = 0;
  try {
    while (true) {
      const span = tracer.startSpan("retry.attempt",
        { attributes: { "retry.attempt": attempt } },
        trace.setSpan(context.active(), parent));
      try {
        return await fn();
      } catch (err) {
        if (!bucket.tryTake()) throw err;
        if (!defaultShouldRetry(err, attempt)) throw err;
        const sleepMs = Math.random() * Math.min(cap, base * 2 ** attempt);
        if (Date.now() + sleepMs > deadline) throw err;
        await sleep(sleepMs);
        attempt++;
      } finally {
        span.end();
      }
    }
  } finally {
    parent.end();
  }
}`;

const DIFF_CODE = `- export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
-   let lastErr;
-   for (let i = 0; i < attempts; i++) {
-     try { return await fn(); }
-     catch (e) { lastErr = e; }
-   }
-   throw lastErr;
- }
+ export async function withRetry<T>(
+   fn: () => Promise<T>,
+   opts: RetryOptions,
+ ): Promise<T> {
+   const deadline = Date.now() + opts.deadlineMs;
+   const base = opts.baseMs ?? 100;
+   const cap  = opts.capMs  ?? 10_000;
+   // full-jitter, deadline-aware, with token-bucket budget and OTel spans.
+   /* ... */
+ }`;

interface HistoryEntry {
  v: string;
  ago: string;
  msg: string;
  author: string;
}

const HISTORY: HistoryEntry[] = [
  { v: "v3", ago: "just now", msg: "Added OTel spans around each attempt", author: "Assistant" },
  { v: "v2", ago: "1m ago", msg: "Deadline-aware + full-jitter + budget", author: "Assistant" },
  { v: "v1", ago: "2m ago", msg: "Initial read — pre-existing code", author: "Assistant" },
];

export function CanvasPane({ onClose }: CanvasPaneProps): JSX.Element {
  const [tab, setTab] = useState<CanvasTab>("preview");
  return (
    <div className="canvas-pane">
      <div className="canvas-head">
        <Icon name="paper" size={15} />
        <div className="canvas-title">retry.ts</div>
        <span className="smallcaps">artifact · v3</span>
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
        {tab === "preview" && (
          <pre
            style={{ margin: 0, whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(SAMPLE_CODE) }}
          />
        )}
        {tab === "diff" && (
          <pre
            style={{
              margin: 0,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {DIFF_CODE}
          </pre>
        )}
        {tab === "history" && (
          <div style={{ fontFamily: "IBM Plex Sans" }}>
            {HISTORY.map((h) => (
              <div
                key={h.v}
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
                    {h.v}
                  </span>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                    {h.ago} · {h.author}
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
                  {h.msg}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
