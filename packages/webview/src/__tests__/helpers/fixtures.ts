import type { Task, Phase, ProgressLog, TaskStatus, ProgressLogType } from "@agent-board/shared";

let _taskId = 1;
let _phaseId = 1;
let _logId = 1;

export function resetFixtureIds(): void {
  _taskId = 1;
  _phaseId = 1;
  _logId = 1;
}

export function createTask(overrides?: Partial<Task>): Task {
  const id = _taskId++;
  return {
    id,
    phase_id: 1,
    title: `Task ${id}`,
    description: null,
    status: "pending" as TaskStatus,
    assigned_agent: null,
    blocked_reason: null,
    position: 0,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

export function createPhase(overrides?: Partial<Phase>): Phase {
  const id = _phaseId++;
  return {
    id,
    project_id: 1,
    title: `Phase ${id}`,
    order: id,
    created_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

export function createProgressLog(overrides?: Partial<ProgressLog>): ProgressLog {
  const id = _logId++;
  return {
    id,
    task_id: 1,
    agent_id: "agent-1",
    type: "note" as ProgressLogType,
    content: `Log entry ${id}`,
    files_changed: null,
    created_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}
