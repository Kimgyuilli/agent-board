import { useEffect, useState } from "react";
import type { Task, TaskStatus, ProgressLog } from "@agent-board/shared";
import StatusDropdown from "./StatusDropdown";
import ProgressTimeline from "./ProgressTimeline";
import ConfirmDialog from "./ConfirmDialog";

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
  onDeleteTask: (taskId: number) => void;
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
  onDeleteTask,
  progressLogs,
  progressLogsLoading,
}: TaskDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDeleteTask(task.id);
    onClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // ConfirmDialog가 열려 있으면 자체 Escape 핸들러에 위임
        if (showDeleteConfirm) return;
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
  }, [onClose, showDeleteConfirm]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="text-sm font-semibold">Task #{task.id}</span>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <button
                className="modal-close"
                onClick={handleDeleteClick}
                type="button"
                aria-label="Delete"
                title="Delete Task"
                style={{ color: "var(--vscode-errorForeground)" }}
              >
                🗑
              </button>
              <button className="modal-close" onClick={onClose} type="button" aria-label="Close">
                ✕
              </button>
            </div>
          </div>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label" htmlFor="task-title">Title</label>
            <input
              id="task-title"
              className="modal-input"
              value={editState.title}
              onChange={(e) => onFieldChange("title", e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              className="modal-input modal-textarea"
              value={editState.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="task-agent">Agent</label>
            <input
              id="task-agent"
              className="modal-input"
              value={editState.assigned_agent}
              onChange={(e) => onFieldChange("assigned_agent", e.target.value)}
              placeholder="agent-id"
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Status</label>
            <StatusDropdown currentStatus={task.status} onStatusChange={onStatusChange} />
          </div>

          {task.status === "blocked" && task.blocked_reason && (
            <div className="modal-field">
              <label className="modal-label">Blocked Reason</label>
              <p className="text-xs" style={{ color: "var(--vscode-errorForeground)" }}>
                {task.blocked_reason}
              </p>
            </div>
          )}

          {progressLogs !== undefined && (
            <div className="modal-field">
              <label className="modal-label">Activity Log</label>
              <ProgressTimeline logs={progressLogs} loading={progressLogsLoading ?? false} />
            </div>
          )}

          <div className="modal-field modal-meta">
            <span>Created: {new Date(task.created_at + "Z").toLocaleString()}</span>
            <span>Updated: {new Date(task.updated_at + "Z").toLocaleString()}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" onClick={onSave} disabled={!isDirty} type="button">
            Save
          </button>
        </div>
      </div>
    </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
