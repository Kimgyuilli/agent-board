import { useState, useEffect, useCallback } from "react";
import type { ProgressLog, ExtensionToWebviewMessage, WebviewToExtensionMessage } from "@agent-board/shared";

export function useProgressLogs(
  taskId: number | null,
  postMessage: (msg: WebviewToExtensionMessage) => void,
) {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId != null) {
      setLoading(true);
      setLogs([]);
      postMessage({ type: "request-progress-logs", taskId });
    } else {
      setLogs([]);
      setLoading(false);
    }
  }, [taskId, postMessage]);

  const handleMessage = useCallback(
    (msg: ExtensionToWebviewMessage) => {
      if (taskId == null) return;
      if (msg.type === "progress-logs-response" && msg.taskId === taskId) {
        setLogs(msg.logs);
        setLoading(false);
      }
      if (msg.type === "progress-log-added" && msg.log.task_id === taskId) {
        setLogs((prev) => [msg.log, ...prev]);
      }
    },
    [taskId],
  );

  return { logs, loading, handleMessage };
}
