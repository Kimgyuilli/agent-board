import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { simulateMessage } from "../helpers/vscode-api-mock";
import { createProgressLog, resetFixtureIds } from "../helpers/fixtures";
import { useProgressLogs } from "../../hooks/useProgressLogs";

describe("useProgressLogs", () => {
  let postMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetFixtureIds();
    postMessage = vi.fn();
  });

  it("should send request-progress-logs when taskId is set", () => {
    renderHook(() => useProgressLogs(1, postMessage));

    expect(postMessage).toHaveBeenCalledWith({ type: "request-progress-logs", taskId: 1 });
  });

  it("should not send request when taskId is null", () => {
    renderHook(() => useProgressLogs(null, postMessage));

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("should set logs on progress-logs-response for matching taskId", () => {
    const { result } = renderHook(() => useProgressLogs(1, postMessage));
    const logs = [createProgressLog({ task_id: 1 })];

    act(() => {
      simulateMessage({ type: "progress-logs-response", taskId: 1, logs });
    });

    expect(result.current.logs).toEqual(logs);
    expect(result.current.loading).toBe(false);
  });

  it("should ignore progress-logs-response for different taskId", () => {
    const { result } = renderHook(() => useProgressLogs(1, postMessage));

    act(() => {
      simulateMessage({ type: "progress-logs-response", taskId: 2, logs: [createProgressLog()] });
    });

    expect(result.current.logs).toEqual([]);
  });

  it("should prepend log on progress-log-added for matching task_id", () => {
    const { result } = renderHook(() => useProgressLogs(1, postMessage));
    const existingLogs = [createProgressLog({ id: 1, task_id: 1 })];

    act(() => {
      simulateMessage({ type: "progress-logs-response", taskId: 1, logs: existingLogs });
    });

    const newLog = createProgressLog({ id: 2, task_id: 1, content: "new" });
    act(() => {
      simulateMessage({ type: "progress-log-added", log: newLog });
    });

    expect(result.current.logs[0].id).toBe(2);
    expect(result.current.logs[1].id).toBe(1);
  });

  it("should reset logs when taskId changes", () => {
    const { result, rerender } = renderHook(
      ({ taskId }) => useProgressLogs(taskId, postMessage),
      { initialProps: { taskId: 1 as number | null } },
    );

    act(() => {
      simulateMessage({ type: "progress-logs-response", taskId: 1, logs: [createProgressLog()] });
    });
    expect(result.current.logs.length).toBe(1);

    rerender({ taskId: 2 });
    expect(result.current.logs).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
