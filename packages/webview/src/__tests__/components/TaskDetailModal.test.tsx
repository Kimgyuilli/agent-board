import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskDetailModal from "../../components/TaskDetailModal";
import { createTask } from "../helpers/fixtures";

function renderModal(overrides?: Record<string, unknown>) {
  const defaultProps = {
    task: createTask({ id: 1, title: "Test Task", status: "pending" as const }),
    editState: { title: "Test Task", description: "", assigned_agent: "" },
    isDirty: false,
    onFieldChange: vi.fn(),
    onStatusChange: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<TaskDetailModal {...defaultProps} />), props: defaultProps };
}

describe("TaskDetailModal", () => {
  it("should render task id and form fields", () => {
    renderModal();
    expect(screen.getByText("Task #1")).toBeDefined();
    expect(screen.getByDisplayValue("Test Task")).toBeDefined();
  });

  it("should render title, description, and agent fields", () => {
    renderModal({
      editState: { title: "T", description: "D", assigned_agent: "A" },
    });
    expect(screen.getByDisplayValue("T")).toBeDefined();
    expect(screen.getByDisplayValue("D")).toBeDefined();
    expect(screen.getByDisplayValue("A")).toBeDefined();
  });

  it("should call onFieldChange when editing title", () => {
    const { props } = renderModal();
    const input = screen.getByDisplayValue("Test Task");
    fireEvent.change(input, { target: { value: "New" } });

    expect(props.onFieldChange).toHaveBeenCalledWith("title", "New");
  });

  it("should disable save button when not dirty", () => {
    renderModal({ isDirty: false });
    const saveBtn = screen.getByText("저장");
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("should enable save button when dirty", () => {
    renderModal({ isDirty: true });
    const saveBtn = screen.getByText("저장");
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("should call onSave when save button clicked", () => {
    const { props } = renderModal({ isDirty: true });
    fireEvent.click(screen.getByText("저장"));
    expect(props.onSave).toHaveBeenCalled();
  });

  it("should call onClose when cancel button clicked", () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByText("취소"));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("should call onClose on Escape key", () => {
    const { props } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("should call onClose when clicking backdrop", () => {
    const { props, container } = renderModal();
    const backdrop = container.querySelector(".modal-backdrop")!;
    fireEvent.click(backdrop);
    expect(props.onClose).toHaveBeenCalled();
  });

  it("should render blocked_reason when blocked", () => {
    renderModal({
      task: createTask({ status: "blocked", blocked_reason: "Need review" }),
    });
    expect(screen.getByText("Need review")).toBeDefined();
  });

  it("should render ProgressTimeline when progressLogs provided", () => {
    renderModal({ progressLogs: [], progressLogsLoading: false });
    // ProgressTimeline empty state
    const el = document.querySelector(".timeline-empty");
    expect(el).not.toBeNull();
  });
});
