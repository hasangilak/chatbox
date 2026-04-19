import type { StatusState } from "../../types";

export interface StatusLineProps {
  state: StatusState;
  tool?: string;
  elapsed?: string;
}

function labelFor(state: StatusState, tool?: string): string {
  switch (state) {
    case "thinking":
      return "Thinking";
    case "pondering":
      return "Pondering";
    case "tool":
      return `Calling ${tool ?? "tool"}`;
    case "approval":
      return "Waiting for your approval";
    case "streaming":
      return "Writing";
    default:
      return "Working";
  }
}

export function StatusLine({ state, tool, elapsed }: StatusLineProps): JSX.Element {
  return (
    <div className="status-line">
      <span className="status-dots">
        <span />
        <span />
        <span />
      </span>
      <span className="status-label">{labelFor(state, tool)}…</span>
      {elapsed && <span className="status-elapsed">{elapsed}</span>}
    </div>
  );
}
