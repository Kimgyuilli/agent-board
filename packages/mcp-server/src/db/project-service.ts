import type Database from "better-sqlite3";
import type { SyncResult } from "@agent-board/shared";

const DEFAULT_PROJECT_NAME = "Default Project";

// === getOrCreateDefaultProject ===

export function getOrCreateDefaultProject(db: Database.Database): number {
  const row = db.prepare("SELECT id FROM projects LIMIT 1").get() as { id: number } | undefined;
  if (row) return row.id;

  const result = db
    .prepare("INSERT OR IGNORE INTO projects (name) VALUES (?)")
    .run(DEFAULT_PROJECT_NAME);
  if (result.changes > 0) return result.lastInsertRowid as number;

  return (db.prepare("SELECT id FROM projects LIMIT 1").get() as { id: number }).id;
}

// === addPhase ===

export function addPhase(
  db: Database.Database,
  title: string,
  projectId?: number,
  order?: number,
): { id: number; title: string; order: number } {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(pid) as
    | { id: number }
    | undefined;
  if (!project) throw new Error(`Project ${pid} not found`);

  const pos =
    order ??
    ((
      db.prepare('SELECT COALESCE(MAX("order"), -1) + 1 AS next_ord FROM phases WHERE project_id = ?').get(pid) as {
        next_ord: number;
      }
    ).next_ord);

  const result = db
    .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, ?)')
    .run(pid, title, pos);

  return { id: result.lastInsertRowid as number, title, order: pos };
}

// === getProjectSummary (sync) ===

export function getProjectSummary(db: Database.Database, projectId?: number): SyncResult {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  const project = db.prepare("SELECT name FROM projects WHERE id = ?").get(pid) as
    | { name: string }
    | undefined;
  if (!project) throw new Error(`Project ${pid} not found`);

  const phases = db
    .prepare(
      `SELECT p.title,
              COUNT(t.id) AS total,
              SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
              SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked
       FROM phases p
       LEFT JOIN tasks t ON t.phase_id = p.id
       WHERE p.project_id = ?
       GROUP BY p.id
       ORDER BY p."order"`,
    )
    .all(pid) as SyncResult["phases"];

  const active_tasks = db
    .prepare(
      `SELECT t.id, t.title, t.status, t.assigned_agent
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ? AND t.status IN ('in_progress', 'blocked')
       ORDER BY t.position`,
    )
    .all(pid) as SyncResult["active_tasks"];

  const recent_logs = db
    .prepare(
      `SELECT pl.type, pl.content, pl.created_at
       FROM progress_logs pl
       JOIN tasks t ON t.id = pl.task_id
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ?
       ORDER BY pl.created_at DESC
       LIMIT 10`,
    )
    .all(pid) as SyncResult["recent_logs"];

  return { project_name: project.name, phases, active_tasks, recent_logs };
}
