import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Task, ProgressLog } from "@agent-board/shared";
import { createMockBoardService } from "./helpers/board-service-mock.js";
import { createTask, createProgressLog, resetFixtureIds } from "./helpers/fixtures.js";

// --- vscode mock ---
let changeHandler: (() => void) | null = null;
let createHandler: (() => void) | null = null;

const mockWatcher = {
  onDidChange: vi.fn((cb: () => void) => {
    changeHandler = cb;
    return { dispose: vi.fn() };
  }),
  onDidCreate: vi.fn((cb: () => void) => {
    createHandler = cb;
    return { dispose: vi.fn() };
  }),
  onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
};

vi.mock("vscode", () => ({
  workspace: {
    createFileSystemWatcher: vi.fn(() => mockWatcher),
  },
  Uri: {
    file: (p: string) => ({
      path: p.replace(/\\/g, "/"),
      with: (change: { path?: string }) => ({
        path: change.path ?? p.replace(/\\/g, "/"),
      }),
    }),
  },
  RelativePattern: vi.fn(),
}));

import { ChangeMonitor } from "../services/ChangeMonitor.js";

// Flush microtasks (resolved promises)
function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
    vi.advanceTimersByTime(0);
  });
}

describe("ChangeMonitor", () => {
  let boardService: ReturnType<typeof createMockBoardService>;
  let onTasksChanged: ReturnType<typeof vi.fn>;
  let onLogsAdded: ReturnType<typeof vi.fn>;
  let outputChannel: { appendLine: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> };
  let monitor: ChangeMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    resetFixtureIds();
    changeHandler = null;
    createHandler = null;

    boardService = createMockBoardService();
    onTasksChanged = vi.fn();
    onLogsAdded = vi.fn();
    outputChannel = { appendLine: vi.fn(), dispose: vi.fn() };

    monitor = new ChangeMonitor(
      "/test/board.db",
      boardService,
      onTasksChanged as (tasks: Task[]) => void,
      onLogsAdded as (logs: ProgressLog[]) => void,
      outputChannel as unknown as import("vscode").OutputChannel,
      { debounceMs: 500, fallbackPollMs: 5000, fallbackIdleMs: 30000 },
    );
  });

  afterEach(() => {
    monitor.dispose();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should create FileSystemWatcher and fallback timer on start()", () => {
    monitor.start();
    expect(mockWatcher.onDidChange).toHaveBeenCalled();
    expect(mockWatcher.onDidCreate).toHaveBeenCalled();
  });

  it("should debounce WAL changes and call getChanges once", async () => {
    const task = createTask();
    (boardService.getChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [task],
      logs: [],
      timestamp: "2026-01-01 00:00:01",
    });

    monitor.start();

    // Fire multiple WAL change events within debounce window
    changeHandler!();
    changeHandler!();
    changeHandler!();

    // Advance past debounce (500ms)
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(boardService.getChanges).toHaveBeenCalledTimes(1);
    expect(onTasksChanged).toHaveBeenCalledWith([task]);
  });

  it("should call onLogsAdded when logs are returned", async () => {
    const log = createProgressLog();
    (boardService.getChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [],
      logs: [log],
      timestamp: "2026-01-01 00:00:01",
    });

    monitor.start();
    changeHandler!();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(onLogsAdded).toHaveBeenCalledWith([log]);
    expect(onTasksChanged).not.toHaveBeenCalled();
  });

  it("should not call callbacks on empty results", async () => {
    (boardService.getChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [],
      logs: [],
      timestamp: "2026-01-01 00:00:01",
    });

    monitor.start();
    changeHandler!();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(onTasksChanged).not.toHaveBeenCalled();
    expect(onLogsAdded).not.toHaveBeenCalled();
  });

  it("should fallback poll after idle period", async () => {
    (boardService.getChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [],
      logs: [],
      timestamp: "2026-01-01 00:00:02",
    });

    monitor.start();

    // No watcher events — advance past fallback poll interval (5s)
    // The fallback checks if idle >= 30s OR lastWatcherEvent === 0
    vi.advanceTimersByTime(5000);
    await flushPromises();

    expect(boardService.getChanges).toHaveBeenCalled();
  });

  it("should log error on getChanges failure", async () => {
    (boardService.getChanges as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    monitor.start();
    changeHandler!();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(outputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("DB error"),
    );
  });

  it("should clean up watcher and timers on dispose()", () => {
    monitor.start();
    monitor.dispose();
    expect(mockWatcher.dispose).toHaveBeenCalled();
  });

  it("should not start if already disposed", () => {
    monitor.dispose();
    monitor.start();
    expect(changeHandler).toBeNull();
  });

  it("should handle onDidCreate event same as onDidChange", async () => {
    const task = createTask();
    (boardService.getChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [task],
      logs: [],
      timestamp: "2026-01-01 00:00:01",
    });

    monitor.start();
    createHandler!();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(boardService.getChanges).toHaveBeenCalledTimes(1);
    expect(onTasksChanged).toHaveBeenCalledWith([task]);
  });

  it("should not poll after dispose even if timer fires", async () => {
    monitor.start();
    changeHandler!();
    monitor.dispose();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(boardService.getChanges).not.toHaveBeenCalled();
  });
});
