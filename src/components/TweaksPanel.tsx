import { Icon } from "./Icon";
import type { Layout, StatusState, Theme, TweakState } from "../types";

export interface TweaksPanelProps {
  state: TweakState;
  set: (patch: Partial<TweakState>) => void;
  onClose: () => void;
}

const THEMES: Theme[] = ["light", "dark"];
const LAYOUTS: Array<[Layout, string]> = [
  ["atelier", "Atelier"],
  ["ledger", "Ledger"],
  ["workshop", "Workshop"],
];
const STATUS_STATES: Array<[StatusState, string]> = [
  ["thinking", "Think"],
  ["pondering", "Ponder"],
  ["tool", "Tool"],
  ["approval", "Wait"],
];

export function TweaksPanel({ state, set, onClose }: TweaksPanelProps): JSX.Element {
  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <Icon name="sliders" size={13} />
        &nbsp;Tweaks
        <button className="icon-btn x" onClick={onClose}>
          <Icon name="x" size={12} />
        </button>
      </div>
      <div className="tweaks-body">
        <div className="field">
          <div className="field-label">
            <span>Theme</span>
          </div>
          <div className="layout-switch" style={{ width: "100%" }}>
            {THEMES.map((t) => (
              <button
                key={t}
                className={state.theme === t ? "active" : ""}
                style={{ flex: 1 }}
                onClick={() => set({ theme: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <div className="field-label">
            <span>Layout</span>
          </div>
          <div className="layout-switch" style={{ width: "100%" }}>
            {LAYOUTS.map(([k, n]) => (
              <button
                key={k}
                className={state.layout === k ? "active" : ""}
                style={{ flex: 1 }}
                onClick={() => set({ layout: k })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <div className="field-label">
            <span>Status chip</span>
          </div>
          <div className="layout-switch" style={{ width: "100%" }}>
            {STATUS_STATES.map(([k, n]) => (
              <button
                key={k}
                className={state.status === k ? "active" : ""}
                style={{ flex: 1 }}
                onClick={() => set({ status: k })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="toggle-row">
          <span>Paper grain</span>
          <div
            className={`toggle ${state.grain ? "on" : ""}`}
            onClick={() => set({ grain: !state.grain })}
          />
        </div>
        <div className="toggle-row">
          <span>Reasoning open by default</span>
          <div
            className={`toggle ${state.reasonOpen ? "on" : ""}`}
            onClick={() => set({ reasonOpen: !state.reasonOpen })}
          />
        </div>
        <div className="toggle-row">
          <span>Show canvas pane</span>
          <div
            className={`toggle ${state.canvas ? "on" : ""}`}
            onClick={() => set({ canvas: !state.canvas })}
          />
        </div>
        <div className="toggle-row">
          <span>Margin notes (Ledger)</span>
          <div
            className={`toggle ${state.margins ? "on" : ""}`}
            onClick={() => set({ margins: !state.margins })}
          />
        </div>
      </div>
    </div>
  );
}
