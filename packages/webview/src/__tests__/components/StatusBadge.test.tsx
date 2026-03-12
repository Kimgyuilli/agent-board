import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "../../components/StatusBadge";

describe("StatusBadge", () => {
  it("should render pending status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeDefined();
  });

  it("should render in_progress status", () => {
    const { container } = render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeDefined();
    expect(container.querySelector(".status-in_progress")).not.toBeNull();
  });

  it("should render done status", () => {
    const { container } = render(<StatusBadge status="done" />);
    expect(screen.getByText("Done")).toBeDefined();
    expect(container.querySelector(".status-done")).not.toBeNull();
  });

  it("should render blocked status", () => {
    const { container } = render(<StatusBadge status="blocked" />);
    expect(screen.getByText("Blocked")).toBeDefined();
    expect(container.querySelector(".status-blocked")).not.toBeNull();
  });
});
