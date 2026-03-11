import { useState, useCallback, useRef } from "react";
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

/**
 * @dnd-kit 기반 드래그앤드롭 로직 훅.
 * 같은 Phase 내 재정렬과 크로스 Phase 이동을 지원하며,
 * 드래그 중 낙관적 업데이트를 적용하고 실패 시 rollback한다.
 */
export function useDragAndDrop({
  tasks,
  onMoveTask,
  applyOptimistic,
  rollback,
  takeSnapshot,
}: UseDragAndDropOptions) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

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

      const currentTasks = tasksRef.current;
      const activePhaseId = findContainer(currentTasks, active.id);
      const overPhaseId = findContainer(currentTasks, over.id);

      if (activePhaseId == null || overPhaseId == null || activePhaseId === overPhaseId) return;

      const taskId = parseTaskId(active.id);
      if (taskId == null) return;

      // Cross-column move: optimistically update phase_id
      applyOptimistic((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, phase_id: overPhaseId } : t)),
      );
    },
    [applyOptimistic],
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
          // 같은 칼럼 내 재정렬: arrayMove로 순서 변경 후 새 인덱스를 position으로 사용
          const reordered = arrayMove(tasksInPhase, activeIndex, overIndex);
          position = reordered.findIndex((t) => t.id === taskId);
        } else {
          // 크로스 칼럼 이동: 드롭 대상 태스크의 위치에 삽입
          position = overIndex >= 0 ? overIndex : tasksInPhase.length;
        }
      } else {
        // Phase 컨테이너에 직접 드롭 (빈 Phase 또는 태스크 사이 아닌 곳) → 맨 끝에 추가
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
