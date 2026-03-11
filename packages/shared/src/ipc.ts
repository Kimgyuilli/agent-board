import type { Phase, Task, TaskStatus, ProgressLog } from "./models.js";

// === JSON-RPC 2.0 기본 타입 ===

export interface RpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface RpcSuccessResponse {
  jsonrpc: "2.0";
  id: number;
  result: unknown;
}

export interface RpcErrorResponse {
  jsonrpc: "2.0";
  id: number;
  error: { code: number; message: string };
}

export type RpcResponse = RpcSuccessResponse | RpcErrorResponse;

// === Board RPC 메서드 정의 ===

export interface BoardRpcMethods {
  getInitData: {
    params: { projectId?: number; includeArchived?: boolean };
    result: { phases: Phase[]; tasks: Task[] };
  };
  moveTask: {
    params: { taskId: number; targetPhaseId: number; position: number };
    result: { tasks: Task[] };
  };
  updateTaskStatus: {
    params: { taskId: number; status: TaskStatus };
    result: { task: Task };
  };
  updateTask: {
    params: {
      taskId: number;
      updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>;
    };
    result: { task: Task };
  };
  archivePhase: {
    params: { phaseId: number; archived: boolean };
    result: { phases: Phase[]; tasks: Task[] };
  };
  getChanges: {
    params: { since: string };
    result: { tasks: Task[]; logs: ProgressLog[]; timestamp: string };
  };
  getProgressLogs: {
    params: { taskId?: number; limit?: number };
    result: { logs: ProgressLog[] };
  };
}

export type BoardRpcMethod = keyof BoardRpcMethods;

// === JSON-RPC 에러 코드 ===

export const RPC_ERROR = {
  PARSE_ERROR: -32700,
  METHOD_NOT_FOUND: -32601,
  SERVER_ERROR: -32000,
} as const;
