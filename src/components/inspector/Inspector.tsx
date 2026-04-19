import { useState } from "react";
import { Icon } from "../Icon";
import { Timeline } from "./Timeline";
import { AgentPanel } from "./AgentPanel";
import { NotesPanel } from "./NotesPanel";

type InspectorTab = "timeline" | "agent" | "notes";

const TABS: InspectorTab[] = ["timeline", "agent", "notes"];

export function Inspector(): JSX.Element {
  const [tab, setTab] = useState<InspectorTab>("timeline");
  return (
    <aside className="inspector">
      <div className="insp-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`insp-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="icon-btn"
          style={{ alignSelf: "center", marginBottom: 6 }}
          title="Collapse"
        >
          <Icon name="chev" size={13} />
        </button>
      </div>
      <div className="insp-body">
        {tab === "timeline" && <Timeline />}
        {tab === "agent" && <AgentPanel />}
        {tab === "notes" && <NotesPanel />}
      </div>
    </aside>
  );
}
