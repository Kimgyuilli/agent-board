import { useState, useEffect, useCallback } from "react";
import type { ProgressLog, ExtensionToWebviewMessage, WebviewToExtensionMessage } from "@agent-board/shared";

/**
 * 태스크별 진행 로그를 조회하고 실시간 업데이트를 수신하는 훅.
 * taskId가 변경되면 기존 로그를 초기화하고 새 로그를 요청한다.
 * progress-log-added 메시지로 실시간 로그를 앞에 추가한다.
 */
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
