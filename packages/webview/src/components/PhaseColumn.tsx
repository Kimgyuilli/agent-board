import React, { useMemo, useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Phase, Task, TaskStatus } from "@agent-board/shared";
import SortableTaskCard from "./SortableTaskCard";
import ConfirmDialog from "./ConfirmDialog";

interface PhaseColumnProps {
  phase: Phase;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
  onArchiveToggle: (phaseId: number, archived: boolean) => void;
  onDeletePhase: (phaseId: number) => void;
}

function PhaseColumn({ phase, tasks, onTaskClick, onStatusChange, onArchiveToggle, onDeletePhase }: PhaseColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `phase-${phase.id}`,
    data: { type: "phase", phaseId: phase.id },
  });

  const taskIds = useMemo(() => tasks.map((t) => `task-${t.id}`), [tasks]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleArchiveToggle = () => {
    onArchiveToggle(phase.id, !phase.archived);
    setShowMenu(false);
  };

  const handleDeleteClick = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDeletePhase(phase.id);
  };

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
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            className="phase-action-btn"
            onClick={() => setShowMenu(!showMenu)}
            title="Phase 액션"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              <button className="dropdown-menu__item" onClick={handleArchiveToggle}>
                {phase.archived ? "Unarchive Phase" : "Archive Phase"}
              </button>
              <button className="dropdown-menu__item dropdown-menu__item--danger" onClick={handleDeleteClick}>
                Delete Phase
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Phase"
        message={`이 Phase와 소속된 ${tasks.length}개의 태스크가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
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
