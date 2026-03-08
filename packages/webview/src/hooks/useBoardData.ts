import { useState, useCallback, useEffect } from "react";
import type {
  Phase,
  Task,
  ExtensionToWebviewMessage,
} from "@agent-board/shared";
import { useVSCodeApi } from "./useVSCodeApi";

export function useBoardData() {
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);

  const handleMessage = useCallback((msg: ExtensionToWebviewMessage) => {
    switch (msg.type) {
      case "init-data":
        setPhases(msg.phases);
        setTasks(msg.tasks);
        setLoading(false);
        break;
      case "tasks-updated":
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
    }
  }, []);

  const { postMessage } = useVSCodeApi(handleMessage);

  useEffect(() => {
    postMessage({ type: "request-refresh" });
  }, [postMessage]);

  return { phases, tasks, loading };
}
