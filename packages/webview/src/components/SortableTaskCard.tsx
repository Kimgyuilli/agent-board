import { useSortable } from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@agent-board/shared";
import TaskCard from "./TaskCard";

interface SortableTaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}

export default function SortableTaskCard({ task, onTaskClick, onStatusChange }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition: transition ?? undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={() => onTaskClick(task)}
        onStatusChange={(status) => onStatusChange(task.id, status)}
        isDragging={isDragging}
      />
    </div>
  );
}
