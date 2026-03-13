import { useState, useCallback, useEffect, useRef } from "react";
import type {
  Phase,
  Task,
  ExtensionToWebviewMessage,
} from "@agent-board/shared";
import { useVSCodeApi } from "./useVSCodeApi";

/**
 * 보드 전체 상태를 관리하는 훅.
 * Extension으로부터 init-data, tasks-updated, error 등의 메시지를 수신하여
 * phases/tasks 상태를 갱신한다. 낙관적 업데이트를 위한 snapshot/rollback을 제공한다.
 */
export function useBoardData() {
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [archivedPhaseCount, setArchivedPhaseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const snapshotRef = useRef<Task[] | null>(null);
  const progressHandlerRef = useRef<((msg: ExtensionToWebviewMessage) => void) | null>(null);
  const setupHandlerRef = useRef<((msg: ExtensionToWebviewMessage) => void) | null>(null);

  const handleMessage = useCallback((msg: ExtensionToWebviewMessage) => {
    switch (msg.type) {
      case "init-data":
        setPhases(msg.phases);
        setTasks(msg.tasks);
        setArchivedPhaseCount(msg.archivedPhaseCount);
        setLoading(false);
        break;
      case "tasks-updated":
        snapshotRef.current = null;
        setTasks((prev) => {
          if (!prev) return msg.tasks;
          const taskMap = new Map(prev.map((t) => [t.id, t]));
          for (const t of msg.tasks) {
            taskMap.set(t.id, t);
          }
          return [...taskMap.values()];
        });
        break;
      case "phases-updated":
        setPhases(msg.phases);
        break;
      case "progress-logs-response":
      case "progress-log-added":
        progressHandlerRef.current?.(msg);
        break;
      case "show-setup-wizard":
      case "check-existing-setup-result":
      case "setup-result":
        setupHandlerRef.current?.(msg);
        break;
      case "error":
        // RPC 실패 시 낙관적 업데이트 롤백
        if (snapshotRef.current) {
          setTasks(snapshotRef.current);
          snapshotRef.current = null;
        }
        break;
    }
  }, []);

  const { postMessage, available } = useVSCodeApi(handleMessage);

  useEffect(() => {
    postMessage({ type: "request-refresh" });
  }, [postMessage]);

  const takeSnapshot = useCallback(() => {
    setTasks((current) => {
      snapshotRef.current = current;
      return current;
    });
  }, []);

  const applyOptimistic = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks((prev) => (prev ? updater(prev) : prev));
  }, []);

  const rollback = useCallback(() => {
    if (snapshotRef.current) {
      setTasks(snapshotRef.current);
      snapshotRef.current = null;
    }
  }, []);

  const setProgressHandler = useCallback((handler: ((msg: ExtensionToWebviewMessage) => void) | null) => {
    progressHandlerRef.current = handler;
  }, []);

  const setSetupHandler = useCallback((handler: ((msg: ExtensionToWebviewMessage) => void) | null) => {
    setupHandlerRef.current = handler;
  }, []);

  return { phases, tasks, archivedPhaseCount, loading, postMessage, takeSnapshot, applyOptimistic, rollback, setProgressHandler, setSetupHandler, available };
}
