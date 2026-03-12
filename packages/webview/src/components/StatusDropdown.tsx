import { useState, useEffect, useRef } from "react";
import type { TaskStatus } from "@agent-board/shared";
import { statusLabels, statusClassNames } from "../constants/status";

const allStatuses: TaskStatus[] = ["pending", "in_progress", "done", "blocked"];

interface StatusDropdownProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
}

export default function StatusDropdown({ currentStatus, onStatusChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="status-dropdown-wrapper" ref={ref}>
      <button
        className={`status-badge ${statusClassNames[currentStatus]}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {statusLabels[currentStatus]}
      </button>
      {open && (
        <div className="status-dropdown" role="listbox" aria-label="Select status">
          {allStatuses.map((value) => (
            <button
              key={value}
              className={`status-dropdown__item ${value === currentStatus ? "status-dropdown__item--active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (value !== currentStatus) {
                  onStatusChange(value);
                }
                setOpen(false);
              }}
              type="button"
              role="option"
              aria-selected={value === currentStatus}
            >
              <span className={`status-dot ${statusClassNames[value]}`} />
              {statusLabels[value]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
