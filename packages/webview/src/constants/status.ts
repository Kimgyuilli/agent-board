import type { TaskStatus } from "@agent-board/shared";

export const statusLabels: Record<TaskStatus, string> = {
  pending: "대기",
  in_progress: "진행 중",
  done: "완료",
  blocked: "차단됨",
};

export const statusClassNames: Record<TaskStatus, string> = {
  pending: "status-pending",
  in_progress: "status-in_progress",
  done: "status-done",
  blocked: "status-blocked",
};
