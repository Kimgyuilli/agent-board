import { spawn, type ChildProcess } from "child_process";
import { createInterface, type Interface as ReadlineInterface } from "readline";
import type * as vscode from "vscode";

export interface ProcessManagerCallbacks {
  onStdoutLine: (line: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number | null) => void;
  onCriticalError?: (message: string) => void;
}

const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 1000;
const GRACEFUL_SHUTDOWN_MS = 5000;

/**
 * board-server 자식 프로세스의 생명주기를 관리한다.
 * 비정상 종료 시 지수 백오프로 최대 3회 자동 재시작한다.
 * 종료 시 stdin.end()로 graceful shutdown을 시도하고, 5초 내 미종료 시 SIGKILL.
 */
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
        const delay = RESTART_DELAY_MS * Math.pow(2, this._restartCount - 1);
        this._restartTimer = setTimeout(() => {
          this._restartTimer = null;
          this.start();
        }, delay);
      }
    });

    this._process.on("error", (err) => {
      this._callbacks.onStderr(`[ProcessManager] spawn error: ${err.message}`);
      this._callbacks.onCriticalError?.(`board-server 시작 실패: ${err.message}`);
      this._rl?.close();
      this._rl = null;
      this._process = null;
      this._callbacks.onExit(null);
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

    // stdin.end()로 graceful shutdown 트리거 (Windows/Unix 모두 호환)
    // board-server는 stdin close → DB 정리 → process.exit(0)
    if (this._process.stdin) {
      this._process.stdin.end();
    }

    // stdin close 후에도 종료되지 않으면 강제 종료
    const killTimer = setTimeout(() => {
      if (this._process) {
        this._process.kill("SIGKILL");
      }
    }, GRACEFUL_SHUTDOWN_MS);

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
