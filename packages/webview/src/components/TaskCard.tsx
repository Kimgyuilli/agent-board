import React from "react";
import type { Task, TaskStatus } from "@agent-board/shared";
import StatusBadge from "./StatusBadge";
import StatusDropdown from "./StatusDropdown";
import AgentBadge from "./AgentBadge";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

function TaskCard({ task, onClick, onStatusChange, isDragging, isOverlay }: TaskCardProps) {
  const className = [
    "task-card",
    isDragging ? "task-card--dragging" : "",
    isOverlay ? "task-card--overlay" : "",
    onClick ? "task-card--clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onClick(); } } : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{task.title}</span>
        <span
          className="shrink-0 text-xs"
          style={{ color: "var(--vscode-descriptionForeground)" }}
        >
          #{task.id}
        </span>
      </div>

      {onStatusChange ? (
        <StatusDropdown currentStatus={task.status} onStatusChange={onStatusChange} />
      ) : (
        <StatusBadge status={task.status} />
      )}

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {task.assigned_agent && (
        <AgentBadge agentId={task.assigned_agent} status={task.status} />
      )}

      {task.status === "blocked" && task.blocked_reason && (
        <div className="blocked-reason">
          {task.blocked_reason}
        </div>
      )}
    </div>
  );
}

export default React.memo(TaskCard);
