import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatusDropdown from "../../components/StatusDropdown";

describe("StatusDropdown", () => {
  it("should show current status label", () => {
    render(<StatusDropdown currentStatus="pending" onStatusChange={vi.fn()} />);
    expect(screen.getByText("Pending")).toBeDefined();
  });

  it("should open dropdown on click", () => {
    const { container } = render(<StatusDropdown currentStatus="pending" onStatusChange={vi.fn()} />);

    fireEvent.click(screen.getByText("Pending"));
    expect(container.querySelector(".status-dropdown")).not.toBeNull();
  });

  it("should call onStatusChange when selecting a different status", () => {
    const onChange = vi.fn();
    render(<StatusDropdown currentStatus="pending" onStatusChange={onChange} />);

    fireEvent.click(screen.getByText("Pending")); // open
    fireEvent.click(screen.getByText("Done")); // select "done"

    expect(onChange).toHaveBeenCalledWith("done");
  });

  it("should close on Escape key", () => {
    const { container } = render(<StatusDropdown currentStatus="pending" onStatusChange={vi.fn()} />);

    fireEvent.click(screen.getByText("Pending")); // open
    expect(container.querySelector(".status-dropdown")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector(".status-dropdown")).toBeNull();
  });

  it("should close on outside click", () => {
    const { container } = render(
      <div>
        <StatusDropdown currentStatus="pending" onStatusChange={vi.fn()} />
        <span data-testid="outside">outside</span>
      </div>,
    );

    fireEvent.click(screen.getByText("Pending")); // open
    expect(container.querySelector(".status-dropdown")).not.toBeNull();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(container.querySelector(".status-dropdown")).toBeNull();
  });
});
