import Database from "better-sqlite3";

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'done', 'blocked')),
  assigned_agent TEXT,
  blocked_reason TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('started', 'completed', 'blocked', 'note')),
  content TEXT,
  files_changed TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_phase_status ON tasks(phase_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_logs_task ON progress_logs(task_id);
`;

export function initializeDatabase(db: Database.Database): void {
  db.exec(SCHEMA_SQL);

  // Migration: add archived column to phases if missing (existing DBs)
  const columns = db.pragma("table_info(phases)") as Array<{ name: string }>;
  const hasArchived = columns.some((c) => c.name === "archived");
  if (!hasArchived) {
    db.exec("ALTER TABLE phases ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  }

  // Migration: add updated_at column to phases if missing (existing DBs)
  const hasUpdatedAt = columns.some((c) => c.name === "updated_at");
  if (!hasUpdatedAt) {
    db.exec("ALTER TABLE phases ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
  }
}
