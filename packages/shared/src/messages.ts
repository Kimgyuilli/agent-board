import type { Task, Phase, ProgressLog } from "./models.js";
import type { SetupProjectConfig } from "./setup.js";

// === Extension → Webview 메시지 ===

export interface TasksUpdatedMessage {
  type: "tasks-updated";
  tasks: Task[];
}

export interface PhasesUpdatedMessage {
  type: "phases-updated";
  phases: Phase[];
}

export interface ProgressLogAddedMessage {
  type: "progress-log-added";
  log: ProgressLog;
}

export interface InitDataMessage {
  type: "init-data";
  phases: Phase[];
  tasks: Task[];
  archivedPhaseCount: number;
}

export interface ProgressLogsResponseMessage {
  type: "progress-logs-response";
  taskId: number;
  logs: ProgressLog[];
}

export interface ErrorMessage {
  type: "error";
  source: string;
  message: string;
}

export interface ShowSetupWizardMessage {
  type: "show-setup-wizard";
}

export interface CheckExistingSetupResultMessage {
  type: "check-existing-setup-result";
  exists: boolean;
  existingFiles: string[];
}

export interface SetupResultMessage {
  type: "setup-result";
  success: boolean;
  filesCreated: string[];
  filesSkipped: string[];
  error?: string;
}

export type ExtensionToWebviewMessage =
  | TasksUpdatedMessage
  | PhasesUpdatedMessage
  | ProgressLogAddedMessage
  | ProgressLogsResponseMessage
  | InitDataMessage
  | ErrorMessage
  | ShowSetupWizardMessage
  | CheckExistingSetupResultMessage
  | SetupResultMessage;

// === Webview → Extension 메시지 ===

export interface MoveTaskMessage {
  type: "move-task";
  taskId: number;
  targetPhaseId: number;
  position: number;
}

export interface UpdateTaskStatusMessage {
  type: "update-task-status";
  taskId: number;
  status: Task["status"];
}

export interface UpdateTaskMessage {
  type: "update-task";
  taskId: number;
  updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>;
}

export interface RequestRefreshMessage {
  type: "request-refresh";
}

export interface RequestProgressLogsMessage {
  type: "request-progress-logs";
  taskId: number;
}

export interface ArchivePhaseMessage {
  type: "archive-phase";
  phaseId: number;
  archived: boolean;
}

export interface DeletePhaseMessage {
  type: "delete-phase";
  phaseId: number;
}

export interface DeleteTaskMessage {
  type: "delete-task";
  taskId: number;
}

export interface ToggleArchiveVisibilityMessage {
  type: "toggle-archive-visibility";
  show: boolean;
}

export interface CheckExistingSetupMessage {
  type: "check-existing-setup";
}

export interface SetupProjectMessage {
  type: "setup-project";
  config: SetupProjectConfig;
}

export type WebviewToExtensionMessage =
  | MoveTaskMessage
  | UpdateTaskStatusMessage
  | UpdateTaskMessage
  | RequestRefreshMessage
  | RequestProgressLogsMessage
  | ArchivePhaseMessage
  | DeletePhaseMessage
  | DeleteTaskMessage
  | ToggleArchiveVisibilityMessage
  | CheckExistingSetupMessage
  | SetupProjectMessage;
