import * as vscode from "vscode";
import type { Task, ProgressLog } from "@agent-board/shared";
import type { IBoardService } from "./BoardClient.js";

export interface ChangeMonitorOptions {
  debounceMs?: number;
  fallbackPollMs?: number;
  fallbackIdleMs?: number;
  onPollError?: (message: string) => void;
}

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_FALLBACK_POLL_MS = 5000;
const DEFAULT_FALLBACK_IDLE_MS = 30000;
const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * DB 변경을 감지하여 webview에 업데이트를 전달하는 모니터.
 * WAL 파일 감시(FileSystemWatcher)를 기본으로, 이벤트 미수신 시 폴링으로 fallback.
 */
export class ChangeMonitor implements vscode.Disposable {
  private _watcher: vscode.FileSystemWatcher | null = null;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private _lastPollTimestamp: string;
  private _lastWatcherEvent = 0;
  private _disposed = false;
  private _consecutiveErrors = 0;

  private readonly _debounceMs: number;
  private readonly _fallbackPollMs: number;
  private readonly _fallbackIdleMs: number;
  private readonly _onPollError?: (message: string) => void;

  constructor(
    private readonly _dbPath: string,
    private readonly _boardClient: IBoardService,
    private readonly _onTasksChanged: (tasks: Task[]) => void,
    private readonly _onLogsAdded: (logs: ProgressLog[]) => void,
    private readonly _outputChannel: vscode.OutputChannel,
    options?: ChangeMonitorOptions,
  ) {
    this._debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this._fallbackPollMs = options?.fallbackPollMs ?? DEFAULT_FALLBACK_POLL_MS;
    this._fallbackIdleMs = options?.fallbackIdleMs ?? DEFAULT_FALLBACK_IDLE_MS;
    this._onPollError = options?.onPollError;
    this._lastPollTimestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  start(): void {
    if (this._disposed) return;

    // Watch WAL file changes
    const walPattern = new vscode.RelativePattern(
      vscode.Uri.file(this._dbPath).with({ path: vscode.Uri.file(this._dbPath).path.replace(/[^/]+$/, "") }),
      "*.db-wal",
    );
    this._lastWatcherEvent = Date.now();
    this._watcher = vscode.workspace.createFileSystemWatcher(walPattern);
    this._watcher.onDidChange(() => this._onWalChanged());
    this._watcher.onDidCreate(() => this._onWalChanged());

    // Fallback polling timer
    this._fallbackTimer = setInterval(() => this._checkFallback(), this._fallbackPollMs);

    this._log("[ChangeMonitor] started");
  }

  stop(): void {
    this._clearDebounce();
    if (this._fallbackTimer) {
      clearInterval(this._fallbackTimer);
      this._fallbackTimer = null;
    }
    if (this._watcher) {
      this._watcher.dispose();
      this._watcher = null;
    }
    this._log("[ChangeMonitor] stopped");
  }

  dispose(): void {
    this._disposed = true;
    this.stop();
  }

  private _onWalChanged(): void {
    this._lastWatcherEvent = Date.now();
    this._clearDebounce();
    this._debounceTimer = setTimeout(() => this._pollChanges(), this._debounceMs);
  }

  private _checkFallback(): void {
    // If we haven't received a WAL event for fallbackIdleMs, poll
    const idle = Date.now() - this._lastWatcherEvent;
    if (this._lastWatcherEvent === 0 || idle >= this._fallbackIdleMs) {
      this._pollChanges();
    }
  }

  private async _pollChanges(): Promise<void> {
    if (this._disposed) return;

    try {
      const result = await this._boardClient.getChanges(this._lastPollTimestamp);
      this._lastPollTimestamp = result.timestamp;
      this._consecutiveErrors = 0;

      if (result.tasks.length > 0) {
        this._onTasksChanged(result.tasks);
      }
      if (result.logs.length > 0) {
        this._onLogsAdded(result.logs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._log(`[ChangeMonitor] poll error: ${msg}`);
      this._consecutiveErrors++;
      if (this._consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        this._onPollError?.(`Change detection polling failed ${this._consecutiveErrors} consecutive times: ${msg}`);
        this._consecutiveErrors = 0;
      }
    }
  }

  private _clearDebounce(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  private _log(message: string): void {
    this._outputChannel.appendLine(message);
  }
}
