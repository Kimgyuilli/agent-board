export type {
  TaskStatus,
  ProgressLogType,
  Project,
  Phase,
  Task,
  ProgressLog,
} from "./models.js";

export type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  TasksUpdatedMessage,
  PhasesUpdatedMessage,
  ProgressLogAddedMessage,
  InitDataMessage,
  MoveTaskMessage,
  UpdateTaskStatusMessage,
  UpdateTaskMessage,
  RequestRefreshMessage,
  ProgressLogsResponseMessage,
  RequestProgressLogsMessage,
} from "./messages.js";

export type {
  SyncParams,
  SyncResult,
  NextParams,
  NextResult,
  ClaimParams,
  ClaimResult,
  CompleteParams,
  CompleteResult,
  BlockParams,
  BlockResult,
  ContextParams,
  ContextResult,
  AddTaskParams,
  AddTaskResult,
  ListTasksParams,
  ListTasksResult,
} from "./mcp.js";

export type {
  RpcRequest,
  RpcSuccessResponse,
  RpcErrorResponse,
  RpcResponse,
  BoardRpcMethods,
  BoardRpcMethod,
} from "./ipc.js";

export { RPC_ERROR } from "./ipc.js";
