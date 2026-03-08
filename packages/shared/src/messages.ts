import type { AgentStatus, Task, Phase, ProgressLog } from "./models.js";

// === Extension → Webview 메시지 ===

export interface TasksUpdatedMessage {
  type: "tasks-updated";
  tasks: Task[];
}

export interface PhasesUpdatedMessage {
  type: "phases-updated";
  phases: Phase[];
}

export interface AgentStatusChangedMessage {
  type: "agent-status-changed";
  agentId: string;
  status: AgentStatus;
  currentActivity: string | null;
}

export interface ProgressLogAddedMessage {
  type: "progress-log-added";
  log: ProgressLog;
}

export interface InitDataMessage {
  type: "init-data";
  phases: Phase[];
  tasks: Task[];
}

export type ExtensionToWebviewMessage =
  | TasksUpdatedMessage
  | PhasesUpdatedMessage
  | AgentStatusChangedMessage
  | ProgressLogAddedMessage
  | InitDataMessage;

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

export type WebviewToExtensionMessage =
  | MoveTaskMessage
  | UpdateTaskStatusMessage
  | UpdateTaskMessage
  | RequestRefreshMessage;
