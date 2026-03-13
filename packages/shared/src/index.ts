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
  ArchivePhaseMessage,
  ShowSetupWizardMessage,
  CheckExistingSetupResultMessage,
  SetupResultMessage,
  CheckExistingSetupMessage,
  SetupProjectMessage,
} from "./messages.js";

export type { SetupTemplate, SetupProjectConfig } from "./setup.js";
export { SETUP_FILES } from "./setup.js";

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
  ArchivePhaseParams,
  ArchivePhaseResult,
  BatchOperation,
  BatchResult,
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
