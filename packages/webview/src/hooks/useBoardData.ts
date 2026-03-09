import { useState, useCallback, useEffect, useRef } from "react";
import type {
  Phase,
  Task,
  ProgressLog,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "@agent-board/shared";
import { useVSCodeApi } from "./useVSCodeApi";

export function useBoardData() {
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const snapshotRef = useRef<Task[] | null>(null);

  const handleMessage = useCallback((msg: ExtensionToWebviewMessage) => {
    switch (msg.type) {
      case "init-data":
        setPhases(msg.phases);
        setTasks(msg.tasks);
        setLoading(false);
        break;
      case "tasks-updated":
        snapshotRef.current = null;
        setTasks((prev) => {
          if (!prev) return msg.tasks;
          if (msg.tasks.length === 1) {
            const t = msg.tasks[0];
            return prev.map((p) => (p.id === t.id ? t : p));
          }
          return msg.tasks;
        });
        break;
      case "phases-updated":
        setPhases(msg.phases);
        break;
      case "progress-log-added":
        setProgressLogs((prev) => [msg.log, ...prev].slice(0, 100));
        break;
      case "progress-logs-response":
        // Handled by useProgressLogs hook directly
        break;
    }
  }, []);

  const { postMessage } = useVSCodeApi(handleMessage);

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

  const typedPostMessage = useCallback(
    (msg: WebviewToExtensionMessage) => postMessage(msg),
    [postMessage],
  );

  return { phases, tasks, progressLogs, loading, postMessage: typedPostMessage, takeSnapshot, applyOptimistic, rollback };
}
