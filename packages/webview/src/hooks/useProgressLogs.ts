import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (taskId == null) return;

    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      if (msg.type === "progress-logs-response" && msg.taskId === taskId) {
        setLogs(msg.logs);
        setLoading(false);
      }
      if (msg.type === "progress-log-added" && msg.log.task_id === taskId) {
        setLogs((prev) => [msg.log, ...prev]);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [taskId]);

  return { logs, loading };
}
