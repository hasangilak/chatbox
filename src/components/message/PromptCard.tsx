import { Icon } from "../Icon";
import { ApprovalCard } from "./ApprovalCard";
import { Clarify } from "./Clarify";
import type { ApprovalDecision, Prompt } from "../../types";
import type { RespondToPromptBody } from "../../api/wire";

export interface PromptCardProps {
  prompt: Prompt;
  /**
   * The turn ended without this prompt being answered — the user stopped it
   * rather than deciding. Answering now cannot resume anything, so the card
   * stops asking.
   */
  moot?: boolean;
  onRespond: (promptId: string, body: RespondToPromptBody) => Promise<void>;
}

function decisionLabel(decision: ApprovalDecision): string {
  if (decision === "allow") return "allowed once";
  if (decision === "always") return "allowed · remembered";
  return "denied";
}

/**
 * One pause awaiting a human — an approval or a clarification, which are the
 * same mechanic on the wire and differ only in `prompt_kind`.
 *
 * An answered prompt renders as history rather than disappearing, because a
 * response can arrive from another tab or long after a reload and the record of
 * what was decided is the point.
 */
export function PromptCard({
  prompt,
  moot = false,
  onRespond,
}: PromptCardProps): JSX.Element | null {
  const { request, response } = prompt;

  if (response === null) {
    // An open prompt always has its request; see the `Prompt.request` note.
    if (request === null) return null;

    if (moot) {
      return (
        <div className="tool">
          <div className="tool-head" style={{ cursor: "default" }}>
            <span className="tool-icon">
              <Icon name="tool" size={11} />
            </span>
            <span className="tool-name">{prompt.tool}</span>
            <span className="tool-status">
              <span className="dot" />
              not run · turn stopped
            </span>
          </div>
        </div>
      );
    }

    return request.prompt_kind === "approval" ? (
      <ApprovalCard
        promptId={prompt.id}
        approval={request.approval}
        requestedAt={prompt.requested_at}
        onRespond={onRespond}
      />
    ) : (
      <Clarify promptId={prompt.id} data={request.clarify} onRespond={onRespond} />
    );
  }

  if (response.prompt_kind === "approval") {
    const ok = response.decision !== "deny";
    return (
      <div className="tool">
        <div className="tool-head" style={{ cursor: "default" }}>
          <span className="tool-icon">
            <Icon name="tool" size={11} />
          </span>
          <span className="tool-name">{prompt.tool}</span>
          <span className={`tool-status ${ok ? "ok" : "err"}`}>
            <span className="dot" />
            {decisionLabel(response.decision)}
          </span>
        </div>
        {response.edited_args && (
          <div className="prompt-settled-note">
            <Icon name="edit" size={11} />
            <span>Ran with your edited arguments, not the ones proposed.</span>
          </div>
        )}
      </div>
    );
  }

  // Clarify: the chip labels live on the request, so a prompt whose request we
  // never saw shows the ids it has rather than inventing labels.
  const chips = request?.prompt_kind === "clarify" ? request.clarify.chips : [];
  const picked = response.answer.selected_chip_ids.map(
    (id) => chips.find((c) => c.id === id)?.label ?? id,
  );

  return (
    <div className="clarify answered">
      {request?.prompt_kind === "clarify" && (
        <div className="clarify-q">{request.clarify.question}</div>
      )}
      <div className="chips">
        {picked.map((label, i) => (
          <span key={i} className="chip selected">
            {label}
          </span>
        ))}
      </div>
      {response.answer.text && <div className="clarify-answer">“{response.answer.text}”</div>}
    </div>
  );
}
