import type { Phase, Task } from "@agent-board/shared";
import TaskCard from "./TaskCard";

interface PhaseColumnProps {
  phase: Phase;
  tasks: Task[];
}

export default function PhaseColumn({ phase, tasks }: PhaseColumnProps) {
  return (
    <div className="phase-column">
      <div className="phase-header">
        <span className="text-xs font-semibold uppercase">{phase.title}</span>
        <span className="phase-count">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
