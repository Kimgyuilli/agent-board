import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskCard from "../../components/TaskCard";
import { createTask } from "../helpers/fixtures";

describe("TaskCard", () => {
  it("should render title and task id", () => {
    const task = createTask({ id: 42, title: "My Task" });
    render(<TaskCard task={task} />);

    expect(screen.getByText("My Task")).toBeDefined();
    expect(screen.getByText("#42")).toBeDefined();
  });

  it("should render StatusBadge when no onStatusChange", () => {
    const task = createTask({ status: "done" });
    render(<TaskCard task={task} />);

    expect(screen.getByText("Done")).toBeDefined();
  });

  it("should render StatusDropdown when onStatusChange provided", () => {
    const task = createTask({ status: "pending" });
    const onChange = vi.fn();
    const { container } = render(<TaskCard task={task} onStatusChange={onChange} />);

    expect(container.querySelector(".status-dropdown-wrapper")).not.toBeNull();
  });

  it("should render description when present", () => {
    const task = createTask({ description: "Some desc" });
    render(<TaskCard task={task} />);

    expect(screen.getByText("Some desc")).toBeDefined();
  });

  it("should not render description when null", () => {
    const task = createTask({ description: null });
    const { container } = render(<TaskCard task={task} />);

    expect(container.querySelector(".task-description")).toBeNull();
  });

  it("should render AgentBadge when assigned_agent is set", () => {
    const task = createTask({ assigned_agent: "coder-1" });
    render(<TaskCard task={task} />);

    expect(screen.getByText("@coder-1")).toBeDefined();
  });

  it("should apply isDragging class", () => {
    const task = createTask();
    const { container } = render(<TaskCard task={task} isDragging />);

    expect(container.querySelector(".task-card--dragging")).not.toBeNull();
  });

  it("should apply isOverlay class", () => {
    const task = createTask();
    const { container } = render(<TaskCard task={task} isOverlay />);

    expect(container.querySelector(".task-card--overlay")).not.toBeNull();
  });

  it("should call onClick when clicked", () => {
    const task = createTask();
    const onClick = vi.fn();
    render(<TaskCard task={task} onClick={onClick} />);

    fireEvent.click(screen.getByText(task.title));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render blocked_reason when blocked", () => {
    const task = createTask({ status: "blocked", blocked_reason: "Waiting for review" });
    render(<TaskCard task={task} />);

    expect(screen.getByText("Waiting for review")).toBeDefined();
  });
});
