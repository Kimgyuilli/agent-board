import type Database from "better-sqlite3";
import type { Task, ProgressLog } from "@agent-board/shared";
import { getOrCreateDefaultProject } from "./project-service.js";

// === getChangesSince ===

export function getChangesSince(
  db: Database.Database,
  since: string,
  projectId?: number,
): { tasks: Task[]; logs: ProgressLog[]; timestamp: string } {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  const tasks = db
    .prepare(
      `SELECT t.*
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ? AND p.archived = 0 AND t.updated_at > ?
       ORDER BY p."order", t.position`,
    )
    .all(pid, since) as Task[];

  const logs = db
    .prepare(
      `SELECT pl.*
       FROM progress_logs pl
       JOIN tasks t ON t.id = pl.task_id
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ? AND pl.created_at > ?
       ORDER BY pl.created_at DESC`,
    )
    .all(pid, since) as ProgressLog[];

  const timestamp = (
    db.prepare("SELECT datetime('now') AS now").get() as { now: string }
  ).now;

  return { tasks, logs, timestamp };
}

// === getProgressLogs ===

export function getProgressLogs(
  db: Database.Database,
  taskId?: number,
  limit = 50,
): ProgressLog[] {
  const clampedLimit = Math.min(Math.max(limit, 1), 200);

  if (taskId != null) {
    return db
      .prepare(
        `SELECT * FROM progress_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(taskId, clampedLimit) as ProgressLog[];
  }

  return db
    .prepare(
      `SELECT * FROM progress_logs ORDER BY created_at DESC LIMIT ?`,
    )
    .all(clampedLimit) as ProgressLog[];
}
