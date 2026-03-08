import type { Task, Phase, ProgressLog, TaskStatus } from "./models.js";

// === MCP 도구 파라미터/결과 타입 ===

// sync: 프로젝트 현재 상태 요약
export interface SyncParams {
  project_id?: number;
}

export interface SyncResult {
  project_name: string;
  phases: Array<{
    title: string;
    total: number;
    done: number;
    in_progress: number;
    blocked: number;
  }>;
  active_tasks: Array<Pick<Task, "id" | "title" | "status" | "assigned_agent">>;
  recent_logs: Array<Pick<ProgressLog, "type" | "content" | "created_at">>;
}

// next: 다음 수행 가능한 태스크 추천
export interface NextParams {
  project_id?: number;
  agent_id?: string;
}

export interface NextResult {
  recommended: Array<
    Pick<Task, "id" | "title" | "description" | "position"> & {
      phase_title: string;
    }
  >;
}

// claim: 태스크 할당
export interface ClaimParams {
  task_id: number;
  agent_id: string;
}

export interface ClaimResult {
  task: Task;
  dependency_logs: ProgressLog[];
}

// complete: 태스크 완료
export interface CompleteParams {
  task_id: number;
  content?: string;
  files_changed?: string;
}

export interface CompleteResult {
  task: Task;
  newly_unblocked: Array<Pick<Task, "id" | "title">>;
  phase_progress: { done: number; total: number };
}

// block: 태스크 블로커 기록
export interface BlockParams {
  task_id: number;
  reason: string;
}

export interface BlockResult {
  task: Task;
}

// context: 태스크 상세 조회
export interface ContextParams {
  task_id: number;
}

export interface ContextResult {
  task: Task;
  phase: Phase;
  logs: ProgressLog[];
  dependencies: Array<Pick<Task, "id" | "title" | "status">>;
  dependents: Array<Pick<Task, "id" | "title" | "status">>;
}

// add_task: 태스크 생성
export interface AddTaskParams {
  phase_id: number;
  title: string;
  description?: string;
  depends_on?: number[];
  position?: number;
}

export interface AddTaskResult {
  task: Task;
}

// list_tasks: 태스크 목록 조회
export interface ListTasksParams {
  project_id?: number;
  phase_id?: number;
  status?: TaskStatus;
  assigned_agent?: string;
}

export interface ListTasksResult {
  tasks: Task[];
}
