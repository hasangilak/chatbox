import { useState } from "react";
import { Icon } from "../Icon";

export interface ReasoningBlockProps {
  steps: string[];
  streaming?: boolean;
  defaultOpen?: boolean;
}

export function ReasoningBlock({
  steps,
  streaming = false,
  defaultOpen = false,
}: ReasoningBlockProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(defaultOpen || streaming);
  return (
    <div className={`reason ${open ? "open" : ""} ${streaming ? "streaming" : ""}`}>
      <div className="reason-head" onClick={() => setOpen(!open)}>
        <span className="reason-caret">
          <Icon name="chev" size={10} />
        </span>
        <span className="reason-label">{streaming ? "Pondering" : "Reasoning"}</span>
        <span className="reason-time">
          {steps.length} step{steps.length !== 1 ? "s" : ""} · 1.8s
        </span>
      </div>
      <div className="reason-body">
        {steps.map((s, i) => (
          <span className="step" key={i}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
