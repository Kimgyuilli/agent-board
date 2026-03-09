import { spawn, type ChildProcess } from "child_process";
import { createInterface, type Interface as ReadlineInterface } from "readline";
import type * as vscode from "vscode";

export interface ProcessManagerCallbacks {
  onStdoutLine: (line: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number | null) => void;
}

const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 1000;

export class ProcessManager implements vscode.Disposable {
  private _process: ChildProcess | null = null;
  private _rl: ReadlineInterface | null = null;
  private _restartCount = 0;
  private _disposed = false;
  private _restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly _serverPath: string,
    private readonly _dbPath: string,
    private readonly _callbacks: ProcessManagerCallbacks,
    private readonly _nodePath: string = "node",
  ) {}

  start(): void {
    if (this._disposed) return;

    this._process = spawn(this._nodePath, [this._serverPath, "--db", this._dbPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    if (this._process.stdout) {
      this._rl = createInterface({ input: this._process.stdout, crlfDelay: Infinity });
      this._rl.on("line", (line) => {
        this._callbacks.onStdoutLine(line);
      });
    }

    if (this._process.stderr) {
      this._process.stderr.on("data", (chunk: Buffer) => {
        this._callbacks.onStderr(chunk.toString());
      });
    }

    this._process.on("exit", (code) => {
      this._rl?.close();
      this._rl = null;
      this._process = null;
      this._callbacks.onExit(code);

      if (!this._disposed && code !== 0 && this._restartCount < MAX_RESTARTS) {
        this._restartCount++;
        this._restartTimer = setTimeout(() => {
          this._restartTimer = null;
          this.start();
        }, RESTART_DELAY_MS);
      }
    });

    this._process.on("error", (err) => {
      this._callbacks.onStderr(`[ProcessManager] spawn error: ${err.message}`);
    });
  }

  send(data: string): void {
    if (!this._process?.stdin?.writable) {
      throw new Error("Process is not running");
    }
    this._process.stdin.write(data + "\n");
  }

  stop(): void {
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }

    if (!this._process) return;

    this._process.kill("SIGTERM");

    const killTimer = setTimeout(() => {
      if (this._process) {
        this._process.kill("SIGKILL");
      }
    }, 3000);

    this._process.once("exit", () => {
      clearTimeout(killTimer);
    });
  }

  get isRunning(): boolean {
    return this._process !== null && !this._process.killed;
  }

  resetRestartCount(): void {
    this._restartCount = 0;
  }

  dispose(): void {
    this._disposed = true;
    this.stop();
  }
}
