import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressTimeline from "../../components/ProgressTimeline";
import { createProgressLog } from "../helpers/fixtures";

describe("ProgressTimeline", () => {
  it("should show loading state", () => {
    const { container } = render(<ProgressTimeline logs={[]} loading={true} />);
    const el = container.querySelector(".timeline-empty");
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain("...");
  });

  it("should show empty state when no logs", () => {
    const { container } = render(<ProgressTimeline logs={[]} loading={false} />);
    const el = container.querySelector(".timeline-empty");
    expect(el).not.toBeNull();
  });

  it("should render log entries", () => {
    const logs = [
      createProgressLog({ type: "completed", content: "Task done" }),
      createProgressLog({ type: "started", content: "Working on it" }),
    ];
    render(<ProgressTimeline logs={logs} loading={false} />);

    expect(screen.getByText("Task done")).toBeDefined();
    expect(screen.getByText("Working on it")).toBeDefined();
  });

  it("should render agent_id when present", () => {
    const logs = [createProgressLog({ agent_id: "bot-1", content: "test" })];
    render(<ProgressTimeline logs={logs} loading={false} />);

    expect(screen.getByText("@bot-1")).toBeDefined();
  });

  it("should not render agent when null", () => {
    const logs = [createProgressLog({ agent_id: null, content: "test" })];
    const { container } = render(<ProgressTimeline logs={logs} loading={false} />);

    expect(container.querySelector(".timeline-agent")).toBeNull();
  });

  it("should not render content when null", () => {
    const logs = [createProgressLog({ content: null })];
    const { container } = render(<ProgressTimeline logs={logs} loading={false} />);

    expect(container.querySelector(".timeline-text")).toBeNull();
  });
});
