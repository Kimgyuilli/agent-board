import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTask, createProgressLog, resetFixtureIds } from "./helpers/fixtures.js";

// --- vscode mock ---
const showInformationMessage = vi.fn().mockResolvedValue(undefined);
const showWarningMessage = vi.fn().mockResolvedValue(undefined);
const getConfiguration = vi.fn(() => ({
  get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
}));
const executeCommand = vi.fn();

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock("vscode", () => ({
  window: {
    showInformationMessage: (...args: any[]) => showInformationMessage(...args),
    showWarningMessage: (...args: any[]) => showWarningMessage(...args),
  },
  workspace: {
    getConfiguration: (...args: any[]) => getConfiguration(...args),
  },
  commands: {
    executeCommand: (...args: any[]) => executeCommand(...args),
  },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

import { NotificationService } from "../services/NotificationService.js";

describe("NotificationService", () => {
  let svc: NotificationService;

  beforeEach(() => {
    resetFixtureIds();
    showInformationMessage.mockReset().mockResolvedValue(undefined);
    showWarningMessage.mockReset().mockResolvedValue(undefined);
    getConfiguration.mockReset().mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    });
    executeCommand.mockReset();

    svc = new NotificationService();
  });

  it("should show information message for completed log", () => {
    const task = createTask({ title: "Setup" });
    const log = createProgressLog({ task_id: task.id, type: "completed", agent_id: "bot-1" });

    svc.notify(log, [task]);

    expect(showInformationMessage).toHaveBeenCalledWith("bot-1 completed: Setup", "View");
  });

  it("should show warning message for blocked log", () => {
    const task = createTask({ title: "Deploy" });
    const log = createProgressLog({ task_id: task.id, type: "blocked", agent_id: "bot-2" });

    svc.notify(log, [task]);

    expect(showWarningMessage).toHaveBeenCalledWith("bot-2 blocked: Deploy", "View");
  });

  it("should use 'Agent' fallback when agent_id is null", () => {
    const task = createTask({ title: "Test" });
    const log = createProgressLog({ task_id: task.id, type: "completed", agent_id: null });

    svc.notify(log, [task]);

    expect(showInformationMessage).toHaveBeenCalledWith("Agent completed: Test", "View");
  });

  it("should skip duplicate log IDs", () => {
    const task = createTask({ title: "Duplicate" });
    const log = createProgressLog({ id: 42, task_id: task.id, type: "completed" });

    svc.notify(log, [task]);
    svc.notify(log, [task]);

    expect(showInformationMessage).toHaveBeenCalledTimes(1);
  });

  it("should prune seen IDs when exceeding eviction interval via TTL", () => {
    const task = createTask({ title: "Prune" });

    // Eviction runs every 100 calls. Add 99 logs first.
    const realDateNow = Date.now;
    let currentTime = realDateNow.call(Date);
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    for (let i = 1; i <= 99; i++) {
      const log = createProgressLog({ id: i, task_id: task.id, type: "completed" });
      svc.notify(log, [task]);
    }

    expect(showInformationMessage).toHaveBeenCalledTimes(99);

    // Advance time past TTL (5 minutes) so old entries are evicted
    currentTime += 6 * 60 * 1000;

    // Log 100 triggers eviction (every 100 calls), clearing all 99 expired entries
    const triggerLog = createProgressLog({ id: 100, task_id: task.id, type: "completed" });
    svc.notify(triggerLog, [task]);

    // Re-notifying with id=1 should work (it was evicted by TTL)
    const log = createProgressLog({ id: 1, task_id: task.id, type: "completed" });
    svc.notify(log, [task]);

    // 99 + 1 + 1 = 101 total calls
    expect(showInformationMessage).toHaveBeenCalledTimes(101);

    vi.spyOn(Date, "now").mockRestore();
  });

  it("should not notify when config is disabled", () => {
    getConfiguration.mockReturnValue({
      get: vi.fn((_key: string, _defaultValue: unknown) => false),
    });

    const task = createTask({ title: "Disabled" });
    const log = createProgressLog({ task_id: task.id, type: "completed" });

    svc.notify(log, [task]);

    expect(showInformationMessage).not.toHaveBeenCalled();
  });

  it("should not notify when task is not found", () => {
    const log = createProgressLog({ task_id: 999, type: "completed" });

    svc.notify(log, []);

    expect(showInformationMessage).not.toHaveBeenCalled();
  });

  it("should not notify for started or note types", () => {
    const task = createTask({ title: "Started" });
    const started = createProgressLog({ task_id: task.id, type: "started" });
    const note = createProgressLog({ task_id: task.id, type: "note" });

    svc.notify(started, [task]);
    svc.notify(note, [task]);

    expect(showInformationMessage).not.toHaveBeenCalled();
    expect(showWarningMessage).not.toHaveBeenCalled();
  });

  it("should execute command when 'View' button is clicked", async () => {
    showInformationMessage.mockResolvedValue("View");

    const task = createTask({ title: "View" });
    const log = createProgressLog({ task_id: task.id, type: "completed" });

    svc.notify(log, [task]);

    // Wait for the .then() to resolve
    await vi.waitFor(() => {
      expect(executeCommand).toHaveBeenCalledWith("agent-board.showBoard");
    });
  });

  it("should not execute command when button is dismissed", async () => {
    showInformationMessage.mockResolvedValue(undefined);

    const task = createTask({ title: "Dismiss" });
    const log = createProgressLog({ task_id: task.id, type: "completed" });

    svc.notify(log, [task]);

    // Give a tick for the promise to resolve
    await new Promise((r) => setTimeout(r, 0));
    expect(executeCommand).not.toHaveBeenCalled();
  });
});
