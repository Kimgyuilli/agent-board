import React, { useMemo } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import type { Phase, Task, TaskStatus } from "@agent-board/shared";
import type { useDragAndDrop } from "../hooks/useDragAndDrop";
import PhaseColumn from "./PhaseColumn";
import DragOverlayCard from "./DragOverlayCard";

type DndState = ReturnType<typeof useDragAndDrop>;

interface KanbanBoardProps {
  phases: Phase[];
  tasks: Task[];
  dnd: DndState;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}

function KanbanBoard({ phases, tasks, dnd, onTaskClick, onStatusChange }: KanbanBoardProps) {
  const tasksByPhase = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const task of tasks) {
      const list = map.get(task.phase_id);
      if (list) {
        list.push(task);
      } else {
        map.set(task.phase_id, [task]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tasks]);

  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.order - b.order),
    [phases],
  );

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={dnd.collisionDetection}
      onDragStart={dnd.handleDragStart}
      onDragOver={dnd.handleDragOver}
      onDragEnd={dnd.handleDragEnd}
      onDragCancel={dnd.handleDragCancel}
    >
      <div className="flex flex-1 gap-3 overflow-x-auto p-3">
        {sortedPhases.map((phase) => (
          <PhaseColumn
            key={phase.id}
            phase={phase}
            tasks={tasksByPhase.get(phase.id) ?? []}
            onTaskClick={onTaskClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
      <DragOverlay>
        {dnd.activeTask ? <DragOverlayCard task={dnd.activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default React.memo(KanbanBoard);
