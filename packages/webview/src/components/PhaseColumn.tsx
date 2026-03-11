import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Phase, Task, TaskStatus } from "@agent-board/shared";
import SortableTaskCard from "./SortableTaskCard";

interface PhaseColumnProps {
  phase: Phase;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}

function PhaseColumn({ phase, tasks, onTaskClick, onStatusChange }: PhaseColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `phase-${phase.id}`,
    data: { type: "phase", phaseId: phase.id },
  });

  const taskIds = useMemo(() => tasks.map((t) => `task-${t.id}`), [tasks]);

  return (
    <div className={`phase-column${phase.archived ? " opacity-50" : ""}`}>
      <div className="phase-header">
        <span className="text-xs font-semibold uppercase">{phase.title}</span>
        {phase.archived === 1 && (
          <span className="ml-1 rounded px-1 text-[10px]" style={{ background: "var(--vscode-badge-background)", color: "var(--vscode-badge-foreground)" }}>
            Archived
          </span>
        )}
        <span className="phase-count">{tasks.length}</span>
      </div>
      {phase.updated_at && (
        <div className="phase-updated-at">수정: {new Date(phase.updated_at + "Z").toLocaleString()}</div>
      )}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-1 flex-col gap-2 overflow-y-auto p-2 ${tasks.length === 0 ? (isOver ? "phase-drop-zone--active" : "phase-drop-zone") : ""}`}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default React.memo(PhaseColumn);
