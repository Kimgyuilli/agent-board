import type * as vscode from "vscode";
import type {
  Phase,
  Task,
  TaskStatus,
  BoardRpcMethod,
  BoardRpcMethods,
  RpcResponse,
} from "@agent-board/shared";
import { ProcessManager } from "./ProcessManager.js";

export interface IBoardService extends vscode.Disposable {
  getInitData(projectId?: number): Promise<{ phases: Phase[]; tasks: Task[] }>;
  moveTask(taskId: number, targetPhaseId: number, position: number): Promise<Task[]>;
  updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task>;
  updateTask(
    taskId: number,
    updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>,
  ): Promise<Task>;
}

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 10_000;

export class BoardClient implements IBoardService {
  private readonly _processManager: ProcessManager;
  private readonly _pending = new Map<number, PendingRequest>();
  private _nextId = 1;
  private _outputChannel?: vscode.OutputChannel;

  constructor(serverPath: string, dbPath: string, outputChannel?: vscode.OutputChannel) {
    this._outputChannel = outputChannel;

    this._processManager = new ProcessManager(serverPath, dbPath, {
      onStdoutLine: (line) => this._handleLine(line),
      onStderr: (data) => this._log(data.trimEnd()),
      onExit: (code) => {
        this._log(`[BoardClient] board-server exited with code ${code}`);
        if (code !== 0) {
          this._rejectAllPending(new Error(`board-server exited with code ${code}`));
        }
      },
    });

    this._processManager.start();
  }

  async getInitData(projectId?: number): Promise<{ phases: Phase[]; tasks: Task[] }> {
    return this._call("getInitData", { projectId });
  }

  async moveTask(taskId: number, targetPhaseId: number, position: number): Promise<Task[]> {
    const result = await this._call("moveTask", { taskId, targetPhaseId, position });
    return result.tasks;
  }

  async updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task> {
    const result = await this._call("updateTaskStatus", { taskId, status });
    return result.task;
  }

  async updateTask(
    taskId: number,
    updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>,
  ): Promise<Task> {
    const result = await this._call("updateTask", { taskId, updates });
    return result.task;
  }

  private _call<M extends BoardRpcMethod>(
    method: M,
    params: BoardRpcMethods[M]["params"],
  ): Promise<BoardRpcMethods[M]["result"]> {
    return new Promise((resolve, reject) => {
      const id = this._nextId++;

      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`RPC timeout: ${method} (id=${id})`));
      }, REQUEST_TIMEOUT_MS);

      this._pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
      });

      const request = JSON.stringify({ jsonrpc: "2.0", id, method, params });

      try {
        this._processManager.send(request);
      } catch (err) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private _handleLine(line: string): void {
    let response: RpcResponse;
    try {
      response = JSON.parse(line);
    } catch {
      this._log(`[BoardClient] invalid JSON from server: ${line}`);
      return;
    }

    const pending = this._pending.get(response.id);
    if (!pending) {
      this._log(`[BoardClient] no pending request for id=${response.id}`);
      return;
    }

    this._pending.delete(response.id);
    clearTimeout(pending.timer);

    if ("error" in response && response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve((response as { result: unknown }).result);
    }
  }

  private _rejectAllPending(error: Error): void {
    for (const [id, pending] of this._pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this._pending.delete(id);
    }
  }

  private _log(message: string): void {
    this._outputChannel?.appendLine(message);
  }

  dispose(): void {
    this._rejectAllPending(new Error("BoardClient disposed"));
    this._processManager.dispose();
  }
}
