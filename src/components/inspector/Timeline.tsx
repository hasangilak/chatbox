type TimelineKind = "user" | "reason" | "tool" | "clar" | "perm" | "stream";
type TimelineStatus = "ok" | "pending" | "err";

interface TimelineRow {
  t: string;
  kind: TimelineKind;
  label: string;
  sub: string;
  status?: TimelineStatus;
}

const ROWS: TimelineRow[] = [
  { t: "11:28:02", kind: "user", label: "You · sent", sub: "Walk me through refactoring the retry policy…" },
  { t: "11:28:03", kind: "reason", label: "Reasoning · 4 steps", sub: "Diagnose → read code → draft policy" },
  { t: "11:28:05", kind: "tool", label: "read_file", sub: "services/orders/src/retry.ts · 0.4s · 18 lines", status: "ok" },
  { t: "11:28:06", kind: "clar", label: "Clarifying question", sub: "Idempotency, jitter, budget, OTel?" },
  { t: "11:30:11", kind: "user", label: "You · sent", sub: "Payments API uses Idempotency-Key…" },
  { t: "11:31:02", kind: "reason", label: "Reasoning · 4 steps", sub: "Full-jitter + retry budget + deadline" },
  { t: "11:31:10", kind: "perm", label: "Permission · write_file", sub: "Allowed once by you" },
  { t: "11:33:22", kind: "user", label: "You · sent", sub: "Approved. Also add OTel spans." },
  { t: "11:34:01", kind: "tool", label: "write_file", sub: "3 files · 1.1s · +222 −9", status: "ok" },
  { t: "11:34:08", kind: "stream", label: "Streaming summary", sub: "128 tokens · in progress", status: "pending" },
];

function dotClass(row: TimelineRow): string {
  if (row.status === "ok") return "ok";
  if (row.status === "pending") return "pending";
  if (row.status === "err") return "err";
  if (row.kind === "reason") return "reason";
  return "";
}

export function Timeline(): JSX.Element {
  return (
    <div className="timeline">
      {ROWS.map((r, i) => (
        <div className="timeline-row" key={i}>
          <div className="t">{r.t}</div>
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
