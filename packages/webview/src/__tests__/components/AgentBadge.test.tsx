import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentBadge from "../../components/AgentBadge";

describe("AgentBadge", () => {
  it("should render agent ID with @ prefix", () => {
    render(<AgentBadge agentId="bot-1" status="pending" />);
    expect(screen.getByText("@bot-1")).toBeDefined();
  });

  it("should render dot with in_progress color", () => {
    const { container } = render(<AgentBadge agentId="bot-1" status="in_progress" />);
    const dot = container.querySelector(".agent-badge__dot") as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.style.background).toContain("--vscode-testing-iconPassed");
  });

  it("should render dot with blocked color", () => {
    const { container } = render(<AgentBadge agentId="bot-1" status="blocked" />);
    const dot = container.querySelector(".agent-badge__dot") as HTMLElement;
    expect(dot.style.background).toContain("--vscode-errorForeground");
  });
});
