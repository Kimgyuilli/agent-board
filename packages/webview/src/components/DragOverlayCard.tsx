import type { Task } from "@agent-board/shared";
import TaskCard from "./TaskCard";

interface DragOverlayCardProps {
  task: Task;
}

export default function DragOverlayCard({ task }: DragOverlayCardProps) {
  return <TaskCard task={task} isOverlay />;
}
