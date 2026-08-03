import { useState } from "react";
import { Icon } from "../Icon";
import { Timeline } from "./Timeline";
import { AgentPanel } from "./AgentPanel";
import { NotesPanel } from "./NotesPanel";
import { TagsPanel } from "./TagsPanel";
import type { Tag } from "../../api/wire";

type InspectorTab = "timeline" | "agent" | "notes" | "tags";

const TABS: InspectorTab[] = ["timeline", "agent", "notes", "tags"];

export interface InspectorProps {
  conversationId: string | null;
  agentName: string | null;
  availableTags: Tag[];
  attachedTags: Tag[];
  onTagsChanged: () => Promise<void> | void;
}

export function Inspector({
  conversationId,
  agentName,
  availableTags,
  attachedTags,
  onTagsChanged,
}: InspectorProps): JSX.Element {
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
        {tab === "timeline" && <Timeline conversationId={conversationId} />}
        {tab === "agent" && <AgentPanel agentName={agentName} />}
        {tab === "notes" && <NotesPanel conversationId={conversationId} />}
        {tab === "tags" && (
          <TagsPanel
            conversationId={conversationId}
            availableTags={availableTags}
            attachedTags={attachedTags}
            onChanged={onTagsChanged}
          />
        )}
      </div>
    </aside>
  );
}
