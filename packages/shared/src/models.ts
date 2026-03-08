// === 태스크 상태 ===

export type TaskStatus = "pending" | "in_progress" | "done" | "blocked";

// === 진행 로그 타입 ===

export type ProgressLogType = "started" | "completed" | "blocked" | "note";

// === 에이전트 상태 ===

export type AgentStatus = "active" | "idle" | "waiting" | "permission";

// === DB 모델 ===

export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Phase {
  id: number;
  project_id: number;
  title: string;
  order: number;
  created_at: string;
}

export interface Task {
  id: number;
  phase_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_agent: string | null;
  blocked_reason: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  task_id: number;
  depends_on_task_id: number;
}

export interface ProgressLog {
  id: number;
  task_id: number;
  agent_id: string | null;
  type: ProgressLogType;
  content: string | null;
  files_changed: string | null;
  created_at: string;
}
