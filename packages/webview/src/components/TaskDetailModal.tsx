import { useEffect } from "react";
import type { Task, TaskStatus, ProgressLog } from "@agent-board/shared";
import StatusDropdown from "./StatusDropdown";
import ProgressTimeline from "./ProgressTimeline";

interface EditState {
  title: string;
  description: string;
  assigned_agent: string;
}

interface TaskDetailModalProps {
  task: Task;
  editState: EditState;
  isDirty: boolean;
  onFieldChange: (field: keyof EditState, value: string) => void;
  onStatusChange: (status: TaskStatus) => void;
  onSave: () => void;
  onClose: () => void;
  progressLogs?: ProgressLog[];
  progressLogsLoading?: boolean;
}

export default function TaskDetailModal({
  task,
  editState,
  isDirty,
  onFieldChange,
  onStatusChange,
  onSave,
  onClose,
  progressLogs,
  progressLogsLoading,
}: TaskDetailModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab") {
        const modal = document.querySelector(".modal-content");
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="text-sm font-semibold">Task #{task.id}</span>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">제목</label>
            <input
              className="modal-input"
              value={editState.title}
              onChange={(e) => onFieldChange("title", e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">설명</label>
            <textarea
              className="modal-input modal-textarea"
              value={editState.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">담당 에이전트</label>
            <input
              className="modal-input"
              value={editState.assigned_agent}
              onChange={(e) => onFieldChange("assigned_agent", e.target.value)}
              placeholder="agent-id"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">상태</label>
            <StatusDropdown currentStatus={task.status} onStatusChange={onStatusChange} />
          </div>

          {task.status === "blocked" && task.blocked_reason && (
            <div className="modal-field">
              <label className="modal-label">차단 사유</label>
              <p className="text-xs" style={{ color: "var(--vscode-errorForeground)" }}>
                {task.blocked_reason}
              </p>
            </div>
          )}

          {progressLogs !== undefined && (
            <div className="modal-field">
              <label className="modal-label">활동 기록</label>
              <ProgressTimeline logs={progressLogs} loading={progressLogsLoading ?? false} />
            </div>
          )}

          <div className="modal-field modal-meta">
            <span>생성: {new Date(task.created_at).toLocaleString()}</span>
            <span>수정: {new Date(task.updated_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} type="button">
            취소
          </button>
          <button className="btn-primary" onClick={onSave} disabled={!isDirty} type="button">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
