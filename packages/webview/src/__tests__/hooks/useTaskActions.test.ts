import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTaskActions } from "../../hooks/useTaskActions";

describe("useTaskActions", () => {
  it("should send move-task message", () => {
    const postMessage = vi.fn();
    const { result } = renderHook(() => useTaskActions(postMessage));

    result.current.moveTask(1, 2, 0);

    expect(postMessage).toHaveBeenCalledWith({
      type: "move-task",
      taskId: 1,
      targetPhaseId: 2,
      position: 0,
    });
  });

  it("should send update-task-status message", () => {
    const postMessage = vi.fn();
    const { result } = renderHook(() => useTaskActions(postMessage));

    result.current.updateTaskStatus(1, "done");

    expect(postMessage).toHaveBeenCalledWith({
      type: "update-task-status",
      taskId: 1,
      status: "done",
    });
  });

  it("should send update-task message", () => {
    const postMessage = vi.fn();
    const { result } = renderHook(() => useTaskActions(postMessage));

    result.current.updateTask(1, { title: "New Title" });

    expect(postMessage).toHaveBeenCalledWith({
      type: "update-task",
      taskId: 1,
      updates: { title: "New Title" },
    });
  });
});
