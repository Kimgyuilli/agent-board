import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { Readable, Writable } from "stream";

// Mock child_process before importing BoardClient
const mockProcess = {
  stdin: null as Writable | null,
  stdout: null as Readable | null,
  stderr: null as Readable | null,
  killed: false,
  kill: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
};

vi.mock("child_process", () => ({
  spawn: vi.fn(() => mockProcess),
}));

// Mock vscode
vi.mock("vscode", () => ({
  window: {
    createOutputChannel: () => ({
      appendLine: vi.fn(),
      dispose: vi.fn(),
    }),
  },
}));

import { BoardClient } from "../services/BoardClient.js";

class MockStdin extends Writable {
  public written: string[] = [];
  _write(chunk: Buffer, _encoding: string, callback: () => void) {
    this.written.push(chunk.toString());
    callback();
  }
}

class MockStdout extends Readable {
  private _emitter = new EventEmitter();

  _read() {
    // no-op
  }

  sendLine(line: string) {
    this.push(line + "\n");
  }
}

class MockStderr extends Readable {
  _read() {
    // no-op
  }
}

describe("BoardClient", () => {
  let stdin: MockStdin;
  let stdout: MockStdout;
  let stderr: MockStderr;
  let client: BoardClient;
  let _exitCallback: ((code: number | null) => void) | undefined;

  beforeEach(() => {
    stdin = new MockStdin();
    stdout = new MockStdout();
    stderr = new MockStderr();

    mockProcess.stdin = stdin;
    mockProcess.stdout = stdout;
    mockProcess.stderr = stderr;
    mockProcess.killed = false;
    mockProcess.kill = vi.fn();
    mockProcess.on = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (event === "exit") {
        _exitCallback = cb as (code: number | null) => void;
      }
      return mockProcess;
    });
    mockProcess.once = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (event === "exit") {
        _exitCallback = cb as (code: number | null) => void;
      }
      return mockProcess;
    });

    client = new BoardClient("/fake/board-server.js", "/fake/board.db");
  });

  afterEach(() => {
    client.dispose();
    _exitCallback = undefined;
  });

  it("should send JSON-RPC request and resolve on success response", async () => {
    const promise = client.getInitData();

    // Read the request sent to stdin
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stdin.written.length).toBeGreaterThan(0);

    const request = JSON.parse(stdin.written[0].trim());
    expect(request.jsonrpc).toBe("2.0");
    expect(request.method).toBe("getInitData");

    // Send response
    const response = {
      jsonrpc: "2.0",
      id: request.id,
      result: { phases: [], tasks: [] },
    };
    stdout.sendLine(JSON.stringify(response));

    const result = await promise;
    expect(result.phases).toEqual([]);
    expect(result.tasks).toEqual([]);
  });

  it("should reject on error response", async () => {
    const promise = client.updateTaskStatus(999, "done");

    await new Promise((resolve) => setTimeout(resolve, 10));
    const request = JSON.parse(stdin.written[0].trim());

    stdout.sendLine(
      JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32000, message: "Task 999 not found" },
      }),
    );

    await expect(promise).rejects.toThrow("Task 999 not found");
  });

  it("should call moveTask with correct params", async () => {
    const promise = client.moveTask(1, 2, 0);

    await new Promise((resolve) => setTimeout(resolve, 10));
    const request = JSON.parse(stdin.written[0].trim());
    expect(request.method).toBe("moveTask");
    expect(request.params).toEqual({ taskId: 1, targetPhaseId: 2, position: 0 });

    stdout.sendLine(
      JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        result: { tasks: [{ id: 1, phase_id: 2, position: 0 }] },
      }),
    );

    const tasks = await promise;
    expect(tasks[0].phase_id).toBe(2);
  });

  it("should call updateTask with correct params", async () => {
    const promise = client.updateTask(1, { title: "New Title" });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const request = JSON.parse(stdin.written[0].trim());
    expect(request.method).toBe("updateTask");
    expect(request.params.taskId).toBe(1);
    expect(request.params.updates).toEqual({ title: "New Title" });

    stdout.sendLine(
      JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        result: { task: { id: 1, title: "New Title" } },
      }),
    );

    const task = await promise;
    expect(task.title).toBe("New Title");
  });

  it("should reject all pending on dispose", async () => {
    const promise = client.getInitData();

    // Don't send a response, just dispose
    client.dispose();

    await expect(promise).rejects.toThrow("BoardClient disposed");
  });
});
