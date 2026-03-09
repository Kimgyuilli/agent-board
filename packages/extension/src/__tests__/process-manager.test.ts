import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { Readable, Writable } from "stream";
import type { ProcessManagerCallbacks } from "../services/ProcessManager.js";

// --- Mocks ---
let spawnResult: ReturnType<typeof createFakeProcess>;
const spawnMock = vi.fn(() => spawnResult);

vi.mock("child_process", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spawn: (...args: any[]) => spawnMock(...args),
}));

vi.mock("vscode", () => ({}));

import { ProcessManager } from "../services/ProcessManager.js";

// --- Helpers ---

class FakeStdin extends Writable {
  public written: string[] = [];
  public ended = false;

  _write(chunk: Buffer, _encoding: string, cb: () => void) {
    this.written.push(chunk.toString());
    cb();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override end(...args: any[]) {
    this.ended = true;
    return super.end(...args);
  }
}

class FakeStdout extends Readable {
  _read() {
    // no-op
  }

  sendLine(line: string) {
    this.push(line + "\n");
  }
}

class FakeStderr extends Readable {
  _read() {
    // no-op
  }
}

function createFakeProcess() {
  const emitter = new EventEmitter();
  const stdin = new FakeStdin();
  const stdout = new FakeStdout();
  const stderr = new FakeStderr();

  return {
    stdin,
    stdout,
    stderr,
    killed: false,
    kill: vi.fn(function (this: ReturnType<typeof createFakeProcess>) {
      this.killed = true;
    }),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      emitter.on(event, cb);
      return spawnResult;
    }),
    once: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      emitter.once(event, cb);
      return spawnResult;
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit: (event: string, ...args: any[]) => emitter.emit(event, ...args),
    _emitter: emitter,
  };
}

describe("ProcessManager", () => {
  let callbacks: ProcessManagerCallbacks;
  let pm: ProcessManager;

  beforeEach(() => {
    vi.useFakeTimers();
    spawnResult = createFakeProcess();
    spawnMock.mockReturnValue(spawnResult);

    callbacks = {
      onStdoutLine: vi.fn(),
      onStderr: vi.fn(),
      onExit: vi.fn(),
    };

    pm = new ProcessManager("/server.js", "/test.db", callbacks);
  });

  afterEach(() => {
    pm.dispose();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should call spawn with correct arguments on start()", () => {
    pm.start();
    expect(spawnMock).toHaveBeenCalledWith(
      "node",
      ["/server.js", "--db", "/test.db"],
      expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] }),
    );
  });

  it("should set up readline and forward stdout lines", async () => {
    vi.useRealTimers();
    pm.start();
    spawnResult.stdout.sendLine('{"test":true}');

    // readline processes asynchronously
    await new Promise((r) => setTimeout(r, 50));
    expect(callbacks.onStdoutLine).toHaveBeenCalledWith('{"test":true}');
    vi.useFakeTimers();
  });

  it("should not start if disposed", () => {
    pm.dispose();
    pm.start();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("should send data via stdin.write", () => {
    pm.start();
    pm.send("hello");
    expect(spawnResult.stdin.written).toContain("hello\n");
  });

  it("should throw if sending without running process", () => {
    expect(() => pm.send("hello")).toThrow("Process is not running");
  });

  it("should report isRunning correctly", () => {
    expect(pm.isRunning).toBe(false);
    pm.start();
    expect(pm.isRunning).toBe(true);
  });

  it("should auto-restart on non-zero exit up to 3 times", () => {
    pm.start();
    const firstProcess = spawnResult;

    // Simulate exit with code 1
    firstProcess.emit("exit", 1);
    expect(callbacks.onExit).toHaveBeenCalledWith(1);

    // Create new process for restart
    spawnResult = createFakeProcess();
    spawnMock.mockReturnValue(spawnResult);

    vi.advanceTimersByTime(1000);
    expect(spawnMock).toHaveBeenCalledTimes(2); // initial + 1 restart

    // Second restart
    spawnResult.emit("exit", 1);
    spawnResult = createFakeProcess();
    spawnMock.mockReturnValue(spawnResult);
    vi.advanceTimersByTime(1000);
    expect(spawnMock).toHaveBeenCalledTimes(3);

    // Third restart
    spawnResult.emit("exit", 1);
    spawnResult = createFakeProcess();
    spawnMock.mockReturnValue(spawnResult);
    vi.advanceTimersByTime(1000);
    expect(spawnMock).toHaveBeenCalledTimes(4); // 1 initial + 3 restarts

    // Fourth should NOT restart (max 3)
    spawnResult.emit("exit", 1);
    spawnResult = createFakeProcess();
    spawnMock.mockReturnValue(spawnResult);
    vi.advanceTimersByTime(1000);
    expect(spawnMock).toHaveBeenCalledTimes(4); // no more restarts
  });

  it("should not restart on exit code 0", () => {
    pm.start();
    spawnResult.emit("exit", 0);

    spawnResult = createFakeProcess();
    spawnMock.mockReturnValue(spawnResult);

    vi.advanceTimersByTime(2000);
    expect(spawnMock).toHaveBeenCalledTimes(1); // only initial
  });

  it("should not restart after dispose", () => {
    pm.start();
    pm.dispose();
    spawnResult.emit("exit", 1);

    spawnResult = createFakeProcess();
    spawnMock.mockReturnValue(spawnResult);

    vi.advanceTimersByTime(2000);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("should call stdin.end() on stop()", () => {
    pm.start();
    pm.stop();
    expect(spawnResult.stdin.ended).toBe(true);
  });

  it("should force kill after 3 seconds if process doesn't exit", () => {
    pm.start();
    pm.stop();

    vi.advanceTimersByTime(3000);
    expect(spawnResult.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("should cancel force kill if process exits gracefully", () => {
    pm.start();
    pm.stop();

    // Process exits before 3s timeout
    spawnResult.emit("exit", 0);

    vi.advanceTimersByTime(3000);
    expect(spawnResult.kill).not.toHaveBeenCalled();
  });
});
