import { useState, useCallback, useMemo } from "react";
import type { Task } from "@agent-board/shared";

interface EditState {
  title: string;
  description: string;
  assigned_agent: string;
}

export interface UseTaskDetailReturn {
  selectedTask: Task | null;
  editState: EditState | null;
  openTask: (task: Task) => void;
  closeTask: () => void;
  updateField: (field: keyof EditState, value: string) => void;
  isDirty: boolean;
}

export function useTaskDetail(): UseTaskDetailReturn {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const openTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setEditState({
      title: task.title,
      description: task.description ?? "",
      assigned_agent: task.assigned_agent ?? "",
    });
  }, []);

  const closeTask = useCallback(() => {
    setSelectedTask(null);
    setEditState(null);
  }, []);

  const updateField = useCallback((field: keyof EditState, value: string) => {
    setEditState((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const isDirty = useMemo(() => {
    if (!selectedTask || !editState) return false;
    return (
      editState.title !== selectedTask.title ||
      editState.description !== (selectedTask.description ?? "") ||
      editState.assigned_agent !== (selectedTask.assigned_agent ?? "")
    );
  }, [selectedTask, editState]);

  return { selectedTask, editState, openTask, closeTask, updateField, isDirty };
}
