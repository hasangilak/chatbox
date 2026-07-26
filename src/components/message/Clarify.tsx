import { useState } from "react";
import type { ClarifyData } from "../../types";
import type { RespondToPromptBody } from "../../api/wire";

export interface ClarifyProps {
  promptId: string;
  data: ClarifyData;
  onRespond: (promptId: string, body: RespondToPromptBody) => Promise<void>;
}

export function Clarify({ promptId, data, onRespond }: ClarifyProps): JSX.Element {
  const [selected, setSelected] = useState<string[]>(
    data.chips.filter((c) => c.selected).map((c) => c.id),
  );
  const [text, setText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // No local `sent` flag: the pause is durable, so the reducer's prompt record
  // is what marks this answered — and it does so for a reload or another tab too.
  const submit = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await onRespond(promptId, { selected_chip_ids: selected, text });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="clarify">
      <div className="clarify-q">{data.question}</div>
      <div className="chips">
        {data.chips.map((c) => (
          <button
            key={c.id}
            className={`chip ${selected.includes(c.id) ? "selected" : ""}`}
            onClick={() => toggle(c.id)}
            disabled={sending}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="clarify-input">
        <span className="smallcaps">or say</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder={data.input}
          disabled={sending}
        />
        <button
          className="btn btn-primary"
          style={{ padding: "4px 10px" }}
          onClick={() => void submit()}
          disabled={sending || (selected.length === 0 && text.trim() === "")}
        >
          {sending ? "Sending" : "Send"}
        </button>
      </div>
      {error && <div className="approval-note err">{error}</div>}
    </div>
  );
}
