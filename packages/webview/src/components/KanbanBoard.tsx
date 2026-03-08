import { useMemo } from "react";
import type { Phase, Task } from "@agent-board/shared";
import PhaseColumn from "./PhaseColumn";

interface KanbanBoardProps {
  phases: Phase[];
  tasks: Task[];
}

export default function KanbanBoard({ phases, tasks }: KanbanBoardProps) {
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
    <div className="flex flex-1 gap-3 overflow-x-auto p-3">
      {sortedPhases.map((phase) => (
        <PhaseColumn
          key={phase.id}
          phase={phase}
          tasks={tasksByPhase.get(phase.id) ?? []}
        />
      ))}
    </div>
  );
}
