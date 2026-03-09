export type {
  TaskStatus,
  ProgressLogType,
  AgentStatus,
  Project,
  Phase,
  Task,
  TaskDependency,
  ProgressLog,
} from "./models.js";

export type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  TasksUpdatedMessage,
  PhasesUpdatedMessage,
  AgentStatusChangedMessage,
  ProgressLogAddedMessage,
  InitDataMessage,
  MoveTaskMessage,
  UpdateTaskStatusMessage,
  UpdateTaskMessage,
  RequestRefreshMessage,
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
  TypedRpcRequest,
  BoardRpcResult,
} from "./ipc.js";

export { RPC_ERROR } from "./ipc.js";
