import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { installVSCodeApiMock, mockPostMessage, simulateMessage, resetVSCodeApiMock } from "../helpers/vscode-api-mock";
import { createTask, createPhase, createProgressLog, resetFixtureIds } from "../helpers/fixtures";

// Install vscode API mock before any module loads
installVSCodeApiMock();

import { useBoardData } from "../../hooks/useBoardData";

describe("useBoardData", () => {
  beforeEach(() => {
    resetFixtureIds();
    resetVSCodeApiMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should send request-refresh on mount", () => {
    renderHook(() => useBoardData());
    expect(mockPostMessage).toHaveBeenCalledWith({ type: "request-refresh" });
  });

  it("should start with loading=true", () => {
    const { result } = renderHook(() => useBoardData());
    expect(result.current.loading).toBe(true);
    expect(result.current.phases).toBeNull();
    expect(result.current.tasks).toBeNull();
  });

  it("should set phases and tasks on init-data message", () => {
    const { result } = renderHook(() => useBoardData());

    const phases = [createPhase()];
    const tasks = [createTask()];

    act(() => {
      simulateMessage({ type: "init-data", phases, tasks });
    });

    expect(result.current.phases).toEqual(phases);
    expect(result.current.tasks).toEqual(tasks);
    expect(result.current.loading).toBe(false);
  });

  it("should merge single task on tasks-updated", () => {
    const { result } = renderHook(() => useBoardData());

    const task1 = createTask({ id: 1, title: "Original" });
    const task2 = createTask({ id: 2, title: "Other" });

    act(() => {
      simulateMessage({ type: "init-data", phases: [], tasks: [task1, task2] });
    });

    const updated = { ...task1, title: "Updated" };
    act(() => {
      simulateMessage({ type: "tasks-updated", tasks: [updated] });
    });

    expect(result.current.tasks![0].title).toBe("Updated");
    expect(result.current.tasks![1].title).toBe("Other");
  });

  it("should replace all tasks when tasks-updated has 2+ tasks", () => {
    const { result } = renderHook(() => useBoardData());

    act(() => {
      simulateMessage({ type: "init-data", phases: [], tasks: [createTask(), createTask()] });
    });

    const newTasks = [createTask({ id: 10 }), createTask({ id: 11 })];
    act(() => {
      simulateMessage({ type: "tasks-updated", tasks: newTasks });
    });

    expect(result.current.tasks).toEqual(newTasks);
  });

  it("should prepend progress-log-added and limit to 100", () => {
    const { result } = renderHook(() => useBoardData());

    act(() => {
      simulateMessage({ type: "init-data", phases: [], tasks: [] });
    });

    // Add 101 logs
    for (let i = 1; i <= 101; i++) {
      act(() => {
        simulateMessage({
          type: "progress-log-added",
          log: createProgressLog({ id: i }),
        });
      });
    }

    expect(result.current.progressLogs.length).toBe(100);
    // Most recent (id=101) should be first
    expect(result.current.progressLogs[0].id).toBe(101);
  });

  it("should support takeSnapshot and rollback", () => {
    const { result } = renderHook(() => useBoardData());

    const original = [createTask({ id: 1, title: "Original" })];
    act(() => {
      simulateMessage({ type: "init-data", phases: [], tasks: original });
    });

    act(() => {
      result.current.takeSnapshot();
    });

    // Apply optimistic update
    act(() => {
      result.current.applyOptimistic((prev) =>
        prev.map((t) => ({ ...t, title: "Optimistic" })),
      );
    });

    expect(result.current.tasks![0].title).toBe("Optimistic");

    // Rollback
    act(() => {
      result.current.rollback();
    });

    expect(result.current.tasks![0].title).toBe("Original");
  });

  it("should apply optimistic update via applyOptimistic", () => {
    const { result } = renderHook(() => useBoardData());

    act(() => {
      simulateMessage({ type: "init-data", phases: [], tasks: [createTask({ id: 1, position: 0 })] });
    });

    act(() => {
      result.current.applyOptimistic((prev) =>
        prev.map((t) => ({ ...t, position: 5 })),
      );
    });

    expect(result.current.tasks![0].position).toBe(5);
  });

  it("should update phases on phases-updated message", () => {
    const { result } = renderHook(() => useBoardData());

    act(() => {
      simulateMessage({ type: "init-data", phases: [createPhase({ id: 1 })], tasks: [] });
    });

    const newPhases = [createPhase({ id: 1, title: "Updated" }), createPhase({ id: 2 })];
    act(() => {
      simulateMessage({ type: "phases-updated", phases: newPhases });
    });

    expect(result.current.phases).toEqual(newPhases);
  });
});
