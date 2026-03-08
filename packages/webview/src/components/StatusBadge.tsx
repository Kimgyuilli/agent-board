import type { TaskStatus } from "@agent-board/shared";

const statusLabels: Record<TaskStatus, string> = {
  pending: "대기",
  in_progress: "진행 중",
  done: "완료",
  blocked: "차단됨",
};

interface StatusBadgeProps {
  status: TaskStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status}`}>
      {statusLabels[status]}
    </span>
  );
}
