import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createTask, resetFixtureIds } from "../helpers/fixtures";
import { useTaskDetail } from "../../hooks/useTaskDetail";

describe("useTaskDetail", () => {
  beforeEach(() => {
    resetFixtureIds();
  });

  it("should start with null selectedTask and editState", () => {
    const { result } = renderHook(() => useTaskDetail());
    expect(result.current.selectedTask).toBeNull();
    expect(result.current.editState).toBeNull();
  });

  it("should set selectedTask and editState on openTask", () => {
    const { result } = renderHook(() => useTaskDetail());
    const task = createTask({ title: "Test", description: "desc", assigned_agent: "bot" });

    act(() => {
      result.current.openTask(task);
    });

    expect(result.current.selectedTask).toEqual(task);
    expect(result.current.editState).toEqual({
      title: "Test",
      description: "desc",
      assigned_agent: "bot",
    });
  });

  it("should handle null description and assigned_agent", () => {
    const { result } = renderHook(() => useTaskDetail());
    const task = createTask({ description: null, assigned_agent: null });

    act(() => {
      result.current.openTask(task);
    });

    expect(result.current.editState!.description).toBe("");
    expect(result.current.editState!.assigned_agent).toBe("");
  });

  it("should reset on closeTask", () => {
    const { result } = renderHook(() => useTaskDetail());

    act(() => {
      result.current.openTask(createTask());
    });

    act(() => {
      result.current.closeTask();
    });

    expect(result.current.selectedTask).toBeNull();
    expect(result.current.editState).toBeNull();
  });

  it("should update editState on updateField", () => {
    const { result } = renderHook(() => useTaskDetail());

    act(() => {
      result.current.openTask(createTask({ title: "Original" }));
    });

    act(() => {
      result.current.updateField("title", "Modified");
    });

    expect(result.current.editState!.title).toBe("Modified");
  });

  it("should compute isDirty when fields change", () => {
    const { result } = renderHook(() => useTaskDetail());

    act(() => {
      result.current.openTask(createTask({ title: "Same" }));
    });

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.updateField("title", "Different");
    });

    expect(result.current.isDirty).toBe(true);
  });

  it("should compute isDirty=false when no task is selected", () => {
    const { result } = renderHook(() => useTaskDetail());
    expect(result.current.isDirty).toBe(false);
  });
});
