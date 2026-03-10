import { useState, useCallback } from "react";
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import type { Task } from "@agent-board/shared";

interface UseDragAndDropOptions {
  tasks: Task[];
  onMoveTask: (taskId: number, targetPhaseId: number, position: number) => void;
  applyOptimistic: (updater: (prev: Task[]) => Task[]) => void;
  rollback: () => void;
  takeSnapshot: () => void;
}

function parseTaskId(id: string | number): number | null {
  const s = String(id);
  if (s.startsWith("task-")) return Number(s.slice(5));
  return null;
}

function parsePhaseId(id: string | number): number | null {
  const s = String(id);
  if (s.startsWith("phase-")) return Number(s.slice(6));
  return null;
}

function findContainer(tasks: Task[], id: string | number): number | null {
  const taskId = parseTaskId(id);
  if (taskId != null) {
    const task = tasks.find((t) => t.id === taskId);
    return task?.phase_id ?? null;
  }
  return parsePhaseId(id);
}

function reorderTasksInPhase(
  allTasks: Task[],
  taskId: number,
  targetPhaseId: number,
  position: number,
): Task[] {
  const updated = allTasks.map((t) =>
    t.id === taskId ? { ...t, phase_id: targetPhaseId, position } : t,
  );
  const inPhase = updated
    .filter((t) => t.phase_id === targetPhaseId && t.id !== taskId)
    .sort((a, b) => a.position - b.position);
  inPhase.splice(position, 0, updated.find((t) => t.id === taskId)!);
  const positionMap = new Map(inPhase.map((t, i) => [t.id, i]));
  return updated.map((t) =>
    positionMap.has(t.id) ? { ...t, position: positionMap.get(t.id)! } : t,
  );
}

export function useDragAndDrop({
  tasks,
  onMoveTask,
  applyOptimistic,
  rollback,
  takeSnapshot,
}: UseDragAndDropOptions) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const result = closestCenter(args);
      if (result.length > 0) return result;
      // Fallback: check droppable phase containers
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) =>
          String(c.id).startsWith("phase-"),
        ),
      });
    },
    [],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskId = parseTaskId(event.active.id);
      if (taskId == null) return;
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setActiveTask(task);
        takeSnapshot();
      }
    },
    [tasks, takeSnapshot],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activePhaseId = findContainer(tasks, active.id);
      const overPhaseId = findContainer(tasks, over.id);

      if (activePhaseId == null || overPhaseId == null || activePhaseId === overPhaseId) return;

      const taskId = parseTaskId(active.id);
      if (taskId == null) return;

      // Cross-column move: optimistically update phase_id
      applyOptimistic((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, phase_id: overPhaseId } : t)),
      );
    },
    [tasks, applyOptimistic],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;

      if (!over) {
        rollback();
        return;
      }

      const taskId = parseTaskId(active.id);
      if (taskId == null) {
        rollback();
        return;
      }

      const targetPhaseId = findContainer(tasks, over.id);
      if (targetPhaseId == null) {
        rollback();
        return;
      }

      // Calculate position within the target phase
      const tasksInPhase = tasks
        .filter((t) => t.phase_id === targetPhaseId)
        .sort((a, b) => a.position - b.position);

      const overTaskId = parseTaskId(over.id);
      let position: number;

      if (overTaskId != null) {
        const overIndex = tasksInPhase.findIndex((t) => t.id === overTaskId);
        const activeIndex = tasksInPhase.findIndex((t) => t.id === taskId);

        if (activeIndex >= 0 && overIndex >= 0) {
          // Same column reorder
          const reordered = arrayMove(tasksInPhase, activeIndex, overIndex);
          position = reordered.findIndex((t) => t.id === taskId);
        } else {
          // Cross-column: insert at over's position
          position = overIndex >= 0 ? overIndex : tasksInPhase.length;
        }
      } else {
        // Dropped on empty phase container
        position = tasksInPhase.length;
      }

      // Optimistically reorder
      applyOptimistic((prev) => reorderTasksInPhase(prev, taskId, targetPhaseId, position));

      onMoveTask(taskId, targetPhaseId, position);
    },
    [tasks, onMoveTask, applyOptimistic, rollback],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    rollback();
  }, [rollback]);

  return {
    sensors,
    activeTask,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
