import { useState, useEffect, useRef } from "react";
import type { TaskStatus } from "@agent-board/shared";

const statusOptions: { value: TaskStatus; label: string; className: string }[] = [
  { value: "pending", label: "대기", className: "status-pending" },
  { value: "in_progress", label: "진행 중", className: "status-in_progress" },
  { value: "done", label: "완료", className: "status-done" },
  { value: "blocked", label: "차단됨", className: "status-blocked" },
];

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

  const current = statusOptions.find((o) => o.value === currentStatus)!;

  return (
    <div className="status-dropdown-wrapper" ref={ref}>
      <button
        className={`status-badge ${current.className}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        type="button"
      >
        {current.label}
      </button>
      {open && (
        <div className="status-dropdown">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              className={`status-dropdown__item ${opt.value === currentStatus ? "status-dropdown__item--active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (opt.value !== currentStatus) {
                  onStatusChange(opt.value);
                }
                setOpen(false);
              }}
              type="button"
            >
              <span className={`status-dot ${opt.className}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
