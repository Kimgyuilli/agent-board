import type { Task, Phase, ProgressLog } from "./models.js";

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

export type ExtensionToWebviewMessage =
  | TasksUpdatedMessage
  | PhasesUpdatedMessage
  | ProgressLogAddedMessage
  | ProgressLogsResponseMessage
  | InitDataMessage
  | ErrorMessage;

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

export interface ToggleArchiveVisibilityMessage {
  type: "toggle-archive-visibility";
  show: boolean;
}

export type WebviewToExtensionMessage =
  | MoveTaskMessage
  | UpdateTaskStatusMessage
  | UpdateTaskMessage
  | RequestRefreshMessage
  | RequestProgressLogsMessage
  | ArchivePhaseMessage
  | ToggleArchiveVisibilityMessage;
