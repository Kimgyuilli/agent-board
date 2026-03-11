import type * as vscode from "vscode";
import type {
  Phase,
  Task,
  TaskStatus,
  ProgressLog,
  BoardRpcMethod,
  BoardRpcMethods,
  RpcResponse,
} from "@agent-board/shared";
import { ProcessManager } from "./ProcessManager.js";

/** board-server에 대한 RPC 호출 인터페이스. */
export interface IBoardService extends vscode.Disposable {
  getInitData(projectId?: number, includeArchived?: boolean): Promise<{ phases: Phase[]; tasks: Task[] }>;
  moveTask(taskId: number, targetPhaseId: number, position: number): Promise<Task[]>;
  updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task>;
  updateTask(
    taskId: number,
    updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>,
  ): Promise<Task>;
  archivePhase(phaseId: number, archived: boolean): Promise<{ phases: Phase[]; tasks: Task[] }>;
  getChanges(since: string): Promise<{ tasks: Task[]; logs: ProgressLog[]; timestamp: string }>;
  getProgressLogs(taskId?: number, limit?: number): Promise<{ logs: ProgressLog[] }>;
}

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * board-server 자식 프로세스와 JSON-RPC 2.0으로 통신하는 클라이언트.
 * 요청마다 고유 ID를 부여하고, 타임아웃(10초) 내 응답이 없으면 reject 한다.
 * 프로세스 비정상 종료 시 대기 중인 모든 요청을 reject 한다.
 */
export class BoardClient implements IBoardService {
  private readonly _processManager: ProcessManager;
  private readonly _pending = new Map<number, PendingRequest>();
  private _nextId = 1;
  private _outputChannel?: vscode.OutputChannel;

  constructor(
    serverPath: string,
    dbPath: string,
    outputChannel?: vscode.OutputChannel,
    onCriticalError?: (message: string) => void,
  ) {
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
      onCriticalError,
    });

    this._processManager.start();
  }

  async getInitData(projectId?: number, includeArchived?: boolean): Promise<{ phases: Phase[]; tasks: Task[] }> {
    return this._call("getInitData", { projectId, includeArchived });
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

  async archivePhase(phaseId: number, archived: boolean): Promise<{ phases: Phase[]; tasks: Task[] }> {
    return this._call("archivePhase", { phaseId, archived });
  }

  async getChanges(since: string): Promise<{ tasks: Task[]; logs: ProgressLog[]; timestamp: string }> {
    return this._call("getChanges", { since });
  }

  async getProgressLogs(taskId?: number, limit?: number): Promise<{ logs: ProgressLog[] }> {
    return this._call("getProgressLogs", { taskId, limit });
  }

  /**
   * RPC 요청 생명주기: 전송 → 타임아웃 등록 → pending 맵에 저장.
   * 응답은 _handleLine에서 id로 매칭하여 resolve/reject.
   */
  private _call<M extends BoardRpcMethod>(
    method: M,
    params: BoardRpcMethods[M]["params"],
  ): Promise<BoardRpcMethods[M]["result"]> {
    return new Promise((resolve, reject) => {
      const id = this._nextId++;

      const request = JSON.stringify({ jsonrpc: "2.0", id, method, params });

      // 1. 요청 전송 (프로세스 미실행 시 즉시 reject)
      try {
        this._processManager.send(request);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      // 2. 타임아웃 등록 — 응답 없으면 pending에서 제거 후 reject
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`RPC timeout: ${method} (id=${id})`));
      }, DEFAULT_TIMEOUT_MS);

      // 3. pending 맵에 저장 — _handleLine에서 id로 매칭하여 resolve/reject
      this._pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
      });
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

    // id가 null인 응답은 parse error 등 요청 매칭 불가 → 로그만 남김
    if (response.id == null) {
      const errMsg = "error" in response && response.error ? response.error.message : "unknown";
      this._log(`[BoardClient] server error (no id): ${errMsg}`);
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
