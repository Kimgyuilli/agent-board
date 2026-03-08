import type { Task } from "@agent-board/shared";
import StatusBadge from "./StatusBadge";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="task-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{task.title}</span>
        <span
          className="shrink-0 text-xs"
          style={{ color: "var(--vscode-descriptionForeground)" }}
        >
          #{task.id}
        </span>
      </div>

      <StatusBadge status={task.status} />

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {task.assigned_agent && (
        <p
          className="text-xs"
          style={{ color: "var(--vscode-descriptionForeground)" }}
        >
          @{task.assigned_agent}
        </p>
      )}

      {task.status === "blocked" && task.blocked_reason && (
        <div className="blocked-reason">
          {task.blocked_reason}
        </div>
      )}
    </div>
  );
}
