import { useState } from "react";
import { Icon } from "../Icon";
import { syntaxHighlight } from "../../utils/syntaxHighlight";
import type { ToolCallData, ToolStatus } from "../../types";

export interface ToolCallProps {
  tool: ToolCallData;
}

function statusLabel(status: ToolStatus, elapsed: string | undefined, webSearch: boolean): string {
  if (webSearch) {
    if (status === "ok" || status === "done") return `searched · ${elapsed ?? ""}`.trim();
    if (status === "pending") return "searching";
    return "search failed";
  }
  if (status === "ok") return `ok · ${elapsed ?? ""}`.trim();
  if (status === "pending") return "awaiting approval";
  if (status === "err") return "failed";
  return "done";
}

export function ToolCall({ tool }: ToolCallProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const webSearch = tool.name === "web_search";
  const query = typeof tool.args.query === "string" ? tool.args.query : "";
  const argPairs = webSearch
    ? query
    : Object.entries(tool.args)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : String(v)}`)
        .join(", ");

  return (
    <div className={`tool ${webSearch ? "web-search" : ""} ${open ? "open" : ""}`}>
      <button
        type="button"
        className="tool-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="tool-icon">
          <Icon name={webSearch ? "search" : "tool"} size={11} />
        </span>
        <span className="tool-name">{webSearch ? "Web search" : tool.name}</span>
        {argPairs && (
          <span className="mono tool-args" title={argPairs}>
            {webSearch ? `“${argPairs}”` : argPairs}
          </span>
        )}
        <span className={`tool-status ${tool.status}`}>
          <span className="dot" />
          {statusLabel(tool.status, tool.elapsed, webSearch)}
        </span>
        <Icon name="chevd" size={12} />
      </button>
      <div className="tool-body">
        <div className="tool-pane">
          <div className="tool-pane-label">
            <span>{webSearch ? "Search query" : "Input"}</span>
            <span>{webSearch ? "" : "JSON"}</span>
          </div>
          {webSearch ? (
            <pre>{query}</pre>
          ) : (
            <pre dangerouslySetInnerHTML={{ __html: syntaxHighlight(tool.args) }} />
          )}
        </div>
        {tool.result && (
          <div className="tool-pane">
            <div className="tool-pane-label">
              <span>{webSearch ? "Search results" : "Output"}</span>
              <span>{tool.elapsed}</span>
            </div>
            <pre>{tool.result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
