import { useCallback } from "react";
import type { TaskStatus } from "@agent-board/shared";
import { useBoardData } from "./hooks/useBoardData";
import { useTaskActions } from "./hooks/useTaskActions";
import { useTaskDetail } from "./hooks/useTaskDetail";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import KanbanBoard from "./components/KanbanBoard";
import TaskDetailModal from "./components/TaskDetailModal";
import EmptyState from "./components/EmptyState";

export default function App() {
  const { phases, tasks, loading, postMessage, takeSnapshot, applyOptimistic, rollback } =
    useBoardData();
  const actions = useTaskActions(postMessage);
  const detail = useTaskDetail();

  const dnd = useDragAndDrop({
    tasks: tasks ?? [],
    onMoveTask: actions.moveTask,
    applyOptimistic,
    rollback,
    takeSnapshot,
  });

  const handleStatusChange = useCallback(
    (taskId: number, status: TaskStatus) => {
      actions.updateTaskStatus(taskId, status);
    },
    [actions],
  );

  const handleSave = useCallback(() => {
    if (!detail.selectedTask || !detail.editState || !detail.isDirty) return;
    const updates: Record<string, string | null> = {};
    if (detail.editState.title !== detail.selectedTask.title) {
      updates.title = detail.editState.title;
    }
    if (detail.editState.description !== (detail.selectedTask.description ?? "")) {
      updates.description = detail.editState.description || null;
    }
    if (detail.editState.assigned_agent !== (detail.selectedTask.assigned_agent ?? "")) {
      updates.assigned_agent = detail.editState.assigned_agent || null;
    }
    actions.updateTask(detail.selectedTask.id, updates);
    detail.closeTask();
  }, [detail, actions]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!phases?.length) {
    return (
      <div className="app-container">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header
        className="flex items-center border-b px-4 py-2"
        style={{ borderColor: "var(--vscode-panel-border)" }}
      >
        <h1 className="text-sm font-semibold">Agent Board</h1>
      </header>
      <KanbanBoard
        phases={phases}
        tasks={tasks ?? []}
        dnd={dnd}
        onTaskClick={detail.openTask}
        onStatusChange={handleStatusChange}
      />
      {detail.selectedTask && detail.editState && (
        <TaskDetailModal
          task={detail.selectedTask}
          editState={detail.editState}
          isDirty={detail.isDirty}
          onFieldChange={detail.updateField}
          onStatusChange={(status) => {
            actions.updateTaskStatus(detail.selectedTask!.id, status);
            detail.closeTask();
          }}
          onSave={handleSave}
          onClose={detail.closeTask}
        />
      )}
    </div>
  );
}
