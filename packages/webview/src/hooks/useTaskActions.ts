import { useCallback } from "react";
import type { Task, TaskStatus, WebviewToExtensionMessage } from "@agent-board/shared";

export interface TaskActions {
  moveTask(taskId: number, targetPhaseId: number, position: number): void;
  updateTaskStatus(taskId: number, status: TaskStatus): void;
  updateTask(
    taskId: number,
    updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>,
  ): void;
}

/**
 * webview → extension 방향의 태스크 액션 메시지를 전송하는 훅.
 * moveTask, updateTaskStatus, updateTask를 postMessage로 fire-and-forget 전송한다.
 */
export function useTaskActions(
  postMessage: (msg: WebviewToExtensionMessage) => void,
): TaskActions {
  const moveTask = useCallback(
    (taskId: number, targetPhaseId: number, position: number) => {
      postMessage({ type: "move-task", taskId, targetPhaseId, position });
    },
    [postMessage],
  );

  const updateTaskStatus = useCallback(
    (taskId: number, status: TaskStatus) => {
      postMessage({ type: "update-task-status", taskId, status });
    },
    [postMessage],
  );

  const updateTask = useCallback(
    (taskId: number, updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>) => {
      postMessage({ type: "update-task", taskId, updates });
    },
    [postMessage],
  );

  return { moveTask, updateTaskStatus, updateTask };
}
