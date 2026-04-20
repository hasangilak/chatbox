import { getTimeline } from "../../api/conversations";
import type { TimelineEvent } from "../../api/wire";
import { useAsync } from "../../state/useAsync";

export interface TimelineProps {
  conversationId: string | null;
}

function dotClass(row: TimelineEvent): string {
  if (row.status === "ok") return "ok";
  if (row.status === "pending") return "pending";
  if (row.status === "err") return "err";
  if (row.kind === "reason") return "reason";
  return "";
}

function formatTime(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function Timeline({ conversationId }: TimelineProps): JSX.Element {
  const { status, data, error } = useAsync(
    () => (conversationId ? getTimeline(conversationId) : Promise.resolve([])),
    [conversationId],
  );

  if (!conversationId) {
    return (
      <div className="timeline">
        <div style={{ padding: 16, color: "var(--ink-3)", fontSize: 12 }}>
          Open a conversation to see its timeline.
        </div>
      </div>
    );
  }

  if (status === "loading" && !data) {
    return (
      <div className="timeline">
        <div style={{ padding: 16, color: "var(--ink-3)", fontSize: 12 }}>Loading…</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="timeline">
        <div style={{ padding: 16, color: "var(--crimson)", fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  const rows = data ?? [];
  if (!rows.length) {
    return (
      <div className="timeline">
        <div style={{ padding: 16, color: "var(--ink-3)", fontSize: 12 }}>
          No events yet — send a message to populate the timeline.
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {rows.map((r) => (
        <div className="timeline-row" key={r.id}>
          <div className="t">{formatTime(r.at)}</div>
          <div className="rail">
            <span className={`node ${dotClass(r)}`} />
          </div>
          <div className="body">
            <div className="ev">{r.label}</div>
            <div className="sub">{r.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
