import type { TaskStatus } from "@agent-board/shared";

export const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export const statusClassNames: Record<TaskStatus, string> = {
  pending: "status-pending",
  in_progress: "status-in_progress",
  done: "status-done",
  blocked: "status-blocked",
};
