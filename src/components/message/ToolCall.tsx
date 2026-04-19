import { useState } from "react";
import { Icon } from "../Icon";
import { syntaxHighlight } from "../../utils/syntaxHighlight";
import type { ToolCallData, ToolStatus } from "../../types";

export interface ToolCallProps {
  tool: ToolCallData;
}

function statusLabel(status: ToolStatus, elapsed?: string): string {
  if (status === "ok") return `ok · ${elapsed ?? ""}`.trim();
  if (status === "pending") return "awaiting approval";
  if (status === "err") return "failed";
  return "done";
}

export function ToolCall({ tool }: ToolCallProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const argPairs = Object.entries(tool.args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : String(v)}`)
    .join(", ");

  return (
    <div className={`tool ${open ? "open" : ""}`}>
      <div className="tool-head" onClick={() => setOpen(!open)}>
        <span className="tool-icon">
          <Icon name="tool" size={11} />
        </span>
        <span className="tool-name">{tool.name}(</span>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
          {argPairs}
        </span>
        <span className="tool-name">)</span>
        <span className={`tool-status ${tool.status}`}>
          <span className="dot" />
          {statusLabel(tool.status, tool.elapsed)}
        </span>
        <Icon name="chevd" size={12} />
      </div>
      <div className="tool-body">
        <div className="tool-pane">
          <div className="tool-pane-label">
            <span>Input</span>
            <span>JSON</span>
          </div>
          <pre dangerouslySetInnerHTML={{ __html: syntaxHighlight(tool.args) }} />
        </div>
        {tool.result && (
          <div className="tool-pane">
            <div className="tool-pane-label">
              <span>Output</span>
              <span>{tool.elapsed}</span>
            </div>
            <pre>{tool.result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
