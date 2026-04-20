import { useState } from "react";
import { answerClarify } from "../../api/clarify";
import type { ClarifyChip, ClarifyData } from "../../types";

export interface ClarifyProps {
  data: ClarifyData;
}

export function Clarify({ data }: ClarifyProps): JSX.Element {
  const [chips, setChips] = useState<ClarifyChip[]>(data.chips);
  const [text, setText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setChips((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));

  const submit = async () => {
    if (!data.id || sending || sent) return;
    setSending(true);
    setError(null);
    try {
      await answerClarify(data.id, {
        selected_chip_ids: chips.filter((c) => c.selected).map((c) => c.id),
        text,
      });
      setSent(true);
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
        {chips.map((c) => (
          <button
            key={c.id}
            className={`chip ${c.selected ? "selected" : ""}`}
            onClick={() => toggle(c.id)}
            disabled={sent}
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
          placeholder={data.input}
          disabled={sent}
        />
        <button
          className="btn btn-primary"
          style={{ padding: "4px 10px" }}
          onClick={() => void submit()}
          disabled={sending || sent}
        >
          {sent ? "Sent" : sending ? "Sending" : "Send"}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: 6, color: "var(--crimson)", fontSize: 11.5 }}>{error}</div>
      )}
    </div>
  );
}
