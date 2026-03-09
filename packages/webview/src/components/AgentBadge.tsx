import type { TaskStatus } from "@agent-board/shared";

interface AgentBadgeProps {
  agentId: string;
  status: TaskStatus;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  in_progress: "var(--vscode-testing-iconPassed)",
  blocked: "var(--vscode-errorForeground)",
  done: "var(--vscode-descriptionForeground)",
  pending: "var(--vscode-descriptionForeground)",
};

export default function AgentBadge({ agentId, status }: AgentBadgeProps) {
  return (
    <span className="agent-badge">
      <span
        className="agent-badge__dot"
        style={{ background: STATUS_COLORS[status] }}
      />
      <span className="agent-badge__name">@{agentId}</span>
    </span>
  );
}
