export function NotesPanel(): JSX.Element {
  return (
    <div style={{ padding: "16px 18px" }}>
      <div className="field">
        <div className="field-label">
          <span>Thread notes</span>
          <span>local</span>
        </div>
        <textarea
          className="textarea prompt"
          defaultValue={`Priority: unblock payments team before Friday. Ask about metrics before we ship — they had an SLO burn last week.`}
        />
      </div>
      <div className="field">
        <div className="field-label">
          <span>Pinned snippets</span>
          <span>2</span>
        </div>
        <div
          style={{
            border: "1px solid var(--rule)",
            borderRadius: 3,
            padding: 10,
            marginBottom: 8,
            background: "var(--paper-2)",
          }}
        >
          <div className="smallcaps">Retry policy · from msg 03</div>
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: 13,
              fontStyle: "italic",
              color: "var(--ink-2)",
            }}
          >
            Classification + full-jitter + retry budget + OTel spans.
          </div>
        </div>
        <div
          style={{
            border: "1px solid var(--rule)",
            borderRadius: 3,
            padding: 10,
            background: "var(--paper-2)",
          }}
        >
          <div className="smallcaps">Deadline · from msg 03</div>
          <div className="mono" style={{ fontSize: 12 }}>
            30s per order write
          </div>
        </div>
      </div>
    </div>
  );
}
