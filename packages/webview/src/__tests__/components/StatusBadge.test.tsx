import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "../../components/StatusBadge";

describe("StatusBadge", () => {
  it("should render pending status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("대기")).toBeDefined();
  });

  it("should render in_progress status", () => {
    const { container } = render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("진행 중")).toBeDefined();
    expect(container.querySelector(".status-in_progress")).not.toBeNull();
  });

  it("should render done status", () => {
    const { container } = render(<StatusBadge status="done" />);
    expect(screen.getByText("완료")).toBeDefined();
    expect(container.querySelector(".status-done")).not.toBeNull();
  });

  it("should render blocked status", () => {
    const { container } = render(<StatusBadge status="blocked" />);
    expect(screen.getByText("차단됨")).toBeDefined();
    expect(container.querySelector(".status-blocked")).not.toBeNull();
  });
});
