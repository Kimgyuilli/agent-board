import { useCallback, useEffect, useState } from "react";
import type { TaskStatus, ExtensionToWebviewMessage } from "@agent-board/shared";
import { useBoardData } from "./hooks/useBoardData";
import { useTaskActions } from "./hooks/useTaskActions";
import { useTaskDetail } from "./hooks/useTaskDetail";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useProgressLogs } from "./hooks/useProgressLogs";
import KanbanBoard from "./components/KanbanBoard";
import TaskDetailModal from "./components/TaskDetailModal";
import EmptyState from "./components/EmptyState";
import SetupWizard from "./components/SetupWizard";

export default function App() {
  const { phases, tasks, archivedPhaseCount, loading, postMessage, takeSnapshot, applyOptimistic, rollback, setProgressHandler, setSetupHandler, available } =
    useBoardData();
  const [showArchived, setShowArchived] = useState(false);

  type AppView = "board" | "setup-wizard";
  const [view, setView] = useState<AppView>("board");

  useEffect(() => {
    if (view !== "setup-wizard") {
      const handler = (msg: ExtensionToWebviewMessage) => {
        if (msg.type === "show-setup-wizard") {
          setView("setup-wizard");
        }
      };
      setSetupHandler(handler);
      return () => setSetupHandler(null);
    }
  }, [view, setSetupHandler]);
  const actions = useTaskActions(postMessage);
  const detail = useTaskDetail();
  const progressLogs = useProgressLogs(detail.selectedTask?.id ?? null, postMessage);

  useEffect(() => {
    setProgressHandler(progressLogs.handleMessage);
    return () => setProgressHandler(null);
  }, [setProgressHandler, progressLogs.handleMessage]);

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

  const handleArchiveToggle = useCallback(
    (phaseId: number, archived: boolean) => {
      postMessage({ type: "archive-phase", phaseId, archived });
    },
    [postMessage],
  );

  const handleDeletePhase = useCallback(
    (phaseId: number) => {
      takeSnapshot();
      applyOptimistic((prev) => prev.filter((t) => t.phase_id !== phaseId));
      actions.deletePhase(phaseId);
    },
    [takeSnapshot, applyOptimistic, actions],
  );

  const handleDeleteTask = useCallback(
    (taskId: number) => {
      takeSnapshot();
      applyOptimistic((prev) => prev.filter((t) => t.id !== taskId));
      actions.deleteTask(taskId);
    },
    [takeSnapshot, applyOptimistic, actions],
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

  if (!available) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <span className="text-sm opacity-70">This extension is only available in VS Code</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (view === "setup-wizard") {
    return (
      <div className="app-container">
        <SetupWizard
          onClose={() => {
            setView("board");
            postMessage({ type: "request-refresh" });
          }}
          postMessage={postMessage}
          setSetupHandler={setSetupHandler}
        />
      </div>
    );
  }

  if (!phases?.length) {
    return (
      <div className="app-container">
        <EmptyState
          archivedPhaseCount={archivedPhaseCount}
          onShowArchived={() => {
            setShowArchived(true);
            postMessage({ type: "toggle-archive-visibility", show: true });
          }}
          onSetupProject={() => setView("setup-wizard")}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: "var(--vscode-panel-border)" }}
      >
        <h1 className="text-sm font-semibold">Agent Board</h1>
        <button
          className="flex items-center gap-1 rounded px-2 py-1 text-xs opacity-70 hover:opacity-100"
          style={{ background: showArchived ? "var(--vscode-button-secondaryBackground)" : "transparent" }}
          onClick={() => {
            const next = !showArchived;
            setShowArchived(next);
            postMessage({ type: "toggle-archive-visibility", show: next });
          }}
          title={showArchived ? "Hide archived phases" : "Show archived phases"}
        >
          <span>{showArchived ? "Hide Archived" : `Show Archived${archivedPhaseCount > 0 ? ` (${archivedPhaseCount})` : ""}`}</span>
        </button>
      </header>
      <KanbanBoard
        phases={phases}
        tasks={tasks ?? []}
        dnd={dnd}
        onTaskClick={detail.openTask}
        onStatusChange={handleStatusChange}
        onArchiveToggle={handleArchiveToggle}
        onDeletePhase={handleDeletePhase}
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
          onDeleteTask={handleDeleteTask}
          progressLogs={progressLogs.logs}
          progressLogsLoading={progressLogs.loading}
        />
      )}
    </div>
  );
}
