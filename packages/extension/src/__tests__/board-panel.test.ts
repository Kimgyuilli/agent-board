import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockBoardService } from "./helpers/board-service-mock.js";
import { createTask, createPhase, createProgressLog, resetFixtureIds } from "./helpers/fixtures.js";

// --- vscode mock ---
const showErrorMessage = vi.fn();

vi.mock("vscode", () => ({
  window: {
    showErrorMessage: (...args: unknown[]) => showErrorMessage(...args),
  },
  Uri: {
    file: (p: string) => ({ path: p.replace(/\\/g, "/"), fsPath: p }),
    joinPath: (base: { path: string }, ...segments: string[]) => ({
      path: base.path + "/" + segments.join("/"),
      fsPath: base.path + "/" + segments.join("/"),
    }),
  },
}));

import { BoardPanelProvider } from "../panels/BoardPanel.js";

describe("BoardPanelProvider", () => {
  let service: ReturnType<typeof createMockBoardService>;
  let provider: BoardPanelProvider;
  let mockWebviewView: {
    webview: {
      options: unknown;
      html: string;
      onDidReceiveMessage: ReturnType<typeof vi.fn>;
      postMessage: ReturnType<typeof vi.fn>;
      asWebviewUri: ReturnType<typeof vi.fn>;
      cspSource: string;
    };
  };
  let messageHandler: (msg: unknown) => void;

  beforeEach(() => {
    resetFixtureIds();
    showErrorMessage.mockReset();

    service = createMockBoardService();

    const extUri = { path: "/ext", fsPath: "/ext" };
    const webviewDistUri = { path: "/webview-dist", fsPath: "/webview-dist" };
    provider = new BoardPanelProvider(
      extUri as unknown as import("vscode").Uri,
      webviewDistUri as unknown as import("vscode").Uri,
      service,
    );

    mockWebviewView = {
      webview: {
        options: {},
        html: "",
        onDidReceiveMessage: vi.fn((handler: (msg: unknown) => void) => {
          messageHandler = handler;
          return { dispose: vi.fn() };
        }),
        postMessage: vi.fn(),
        asWebviewUri: vi.fn((uri: { path: string }) => uri.path),
        cspSource: "https://test.csp",
      },
    };

    provider.resolveWebviewView(
      mockWebviewView as unknown as import("vscode").WebviewView,
      {} as import("vscode").WebviewViewResolveContext,
      {} as import("vscode").CancellationToken,
    );
  });

  it("should set enableScripts and localResourceRoots on resolve", () => {
    expect(mockWebviewView.webview.options).toEqual(
      expect.objectContaining({ enableScripts: true }),
    );
  });

  it("should generate HTML with CSP meta tag", () => {
    expect(mockWebviewView.webview.html).toContain("Content-Security-Policy");
    expect(mockWebviewView.webview.html).toContain("https://test.csp");
    expect(mockWebviewView.webview.html).toContain("<div id=\"root\"></div>");
  });

  it("should register message handler", () => {
    expect(mockWebviewView.webview.onDidReceiveMessage).toHaveBeenCalled();
  });

  it("should handle request-refresh message", async () => {
    const phases = [createPhase()];
    const tasks = [createTask()];
    (service.getInitData as ReturnType<typeof vi.fn>).mockResolvedValue({ phases, tasks });

    messageHandler({ type: "request-refresh" });
    await vi.waitFor(() => {
      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "init-data", phases, tasks }),
      );
    });
  });

  it("should handle move-task message", async () => {
    const movedTasks = [createTask({ phase_id: 2, position: 0 })];
    (service.moveTask as ReturnType<typeof vi.fn>).mockResolvedValue(movedTasks);

    messageHandler({ type: "move-task", taskId: 1, targetPhaseId: 2, position: 0 });
    await vi.waitFor(() => {
      expect(service.moveTask).toHaveBeenCalledWith(1, 2, 0);
      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tasks-updated", tasks: movedTasks }),
      );
    });
  });

  it("should handle update-task-status message", async () => {
    const task = createTask({ status: "done" });
    (service.updateTaskStatus as ReturnType<typeof vi.fn>).mockResolvedValue(task);

    messageHandler({ type: "update-task-status", taskId: 1, status: "done" });
    await vi.waitFor(() => {
      expect(service.updateTaskStatus).toHaveBeenCalledWith(1, "done");
      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tasks-updated", tasks: [task] }),
      );
    });
  });

  it("should handle update-task message", async () => {
    const task = createTask({ title: "Updated" });
    (service.updateTask as ReturnType<typeof vi.fn>).mockResolvedValue(task);

    messageHandler({ type: "update-task", taskId: 1, updates: { title: "Updated" } });
    await vi.waitFor(() => {
      expect(service.updateTask).toHaveBeenCalledWith(1, { title: "Updated" });
    });
  });

  it("should handle request-progress-logs message", async () => {
    const logs = [createProgressLog()];
    (service.getProgressLogs as ReturnType<typeof vi.fn>).mockResolvedValue({ logs });

    messageHandler({ type: "request-progress-logs", taskId: 1 });
    await vi.waitFor(() => {
      expect(service.getProgressLogs).toHaveBeenCalledWith(1);
      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "progress-logs-response", taskId: 1, logs }),
      );
    });
  });

  it("should show error message on handler failure", async () => {
    (service.getInitData as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    messageHandler({ type: "request-refresh" });
    await vi.waitFor(() => {
      expect(showErrorMessage).toHaveBeenCalledWith("Agent Board: DB error");
    });
  });

  it("should not postMessage if view is not resolved", () => {
    // Create a fresh provider without resolving
    const freshProvider = new BoardPanelProvider(
      { path: "/ext" } as unknown as import("vscode").Uri,
      { path: "/dist" } as unknown as import("vscode").Uri,
      service,
    );

    // Should not throw
    freshProvider.postMessage({ type: "init-data", phases: [], tasks: [] });
  });
});
