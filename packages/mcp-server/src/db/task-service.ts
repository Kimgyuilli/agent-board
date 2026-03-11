import type Database from "better-sqlite3";
import type {
  Task,
  Phase,
  ProgressLog,
  NextResult,
  ClaimResult,
  CompleteResult,
  BlockResult,
  ContextResult,
  AddTaskResult,
  ListTasksResult,
} from "@agent-board/shared";
import { getOrCreateDefaultProject } from "./project-service.js";
import { wouldCreateCycle } from "./cycle-detection.js";

// === getNextTasks (next) ===

export function getNextTasks(
  db: Database.Database,
  projectId?: number,
  agentId?: string,
): NextResult {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  const baseQuery = `SELECT t.id, t.title, t.description, t.position, p.title AS phase_title
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ?
         AND p.archived = 0
         AND t.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM task_dependencies td
           JOIN tasks dep ON dep.id = td.depends_on_task_id
           WHERE td.task_id = t.id AND dep.status != 'done'
         )
       ORDER BY p."order", t.position
       LIMIT 10`;

  const filteredQuery = `SELECT t.id, t.title, t.description, t.position, p.title AS phase_title
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ?
         AND p.archived = 0
         AND t.status = 'pending'
         AND (t.assigned_agent IS NULL OR t.assigned_agent = ?)
         AND NOT EXISTS (
           SELECT 1 FROM task_dependencies td
           JOIN tasks dep ON dep.id = td.depends_on_task_id
           WHERE td.task_id = t.id AND dep.status != 'done'
         )
       ORDER BY p."order", t.position
       LIMIT 10`;

  const recommended = agentId
    ? db.prepare(filteredQuery).all(pid, agentId) as NextResult["recommended"]
    : db.prepare(baseQuery).all(pid) as NextResult["recommended"];

  return { recommended };
}

// === claimTask ===

export function claimTask(
  db: Database.Database,
  taskId: number,
  agentId: string,
): ClaimResult {
  const claim = db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "pending") {
      throw new Error(`Task ${taskId} is '${task.status}', only 'pending' tasks can be claimed`);
    }

    const unresolved = db
      .prepare(
        `SELECT dep.id, dep.title, dep.status
         FROM task_dependencies td
         JOIN tasks dep ON dep.id = td.depends_on_task_id
         WHERE td.task_id = ? AND dep.status != 'done'`,
      )
      .all(taskId) as Pick<Task, "id" | "title" | "status">[];

    if (unresolved.length > 0) {
      const names = unresolved.map((d) => `#${d.id} ${d.title} (${d.status})`).join(", ");
      throw new Error(`Task ${taskId} has unresolved dependencies: ${names}`);
    }

    db.prepare(
      `UPDATE tasks SET status = 'in_progress', assigned_agent = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(agentId, taskId);

    db.prepare(
      `INSERT INTO progress_logs (task_id, agent_id, type) VALUES (?, ?, 'started')`,
    ).run(taskId, agentId);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;

    const dependency_logs = db
      .prepare(
        `SELECT pl.* FROM progress_logs pl
         JOIN task_dependencies td ON td.depends_on_task_id = pl.task_id
         WHERE td.task_id = ? AND pl.type = 'completed'
         ORDER BY pl.created_at DESC`,
      )
      .all(taskId) as ProgressLog[];

    return { task: updated, dependency_logs };
  });

  return claim();
}

// === completeTask ===

export function completeTask(
  db: Database.Database,
  taskId: number,
  content?: string,
  filesChanged?: string,
): CompleteResult {
  const complete = db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "in_progress") {
      throw new Error(`Task ${taskId} is '${task.status}', only 'in_progress' tasks can be completed`);
    }

    db.prepare(
      `UPDATE tasks SET status = 'done', updated_at = datetime('now') WHERE id = ?`,
    ).run(taskId);

    db.prepare(
      `INSERT INTO progress_logs (task_id, agent_id, type, content, files_changed)
       VALUES (?, ?, 'completed', ?, ?)`,
    ).run(taskId, task.assigned_agent, content ?? null, filesChanged ?? null);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;

    const newly_unblocked = db
      .prepare(
        `SELECT t.id, t.title
         FROM tasks t
         JOIN task_dependencies td ON td.task_id = t.id
         WHERE td.depends_on_task_id = ?
           AND t.status = 'pending'
           AND NOT EXISTS (
             SELECT 1 FROM task_dependencies td2
             JOIN tasks dep ON dep.id = td2.depends_on_task_id
             WHERE td2.task_id = t.id AND dep.status != 'done'
           )`,
      )
      .all(taskId) as Pick<Task, "id" | "title">[];

    const phase_progress = db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
         FROM tasks WHERE phase_id = ?`,
      )
      .get(task.phase_id) as { total: number; done: number };

    return { task: updated, newly_unblocked, phase_progress };
  });

  return complete();
}

// === blockTask ===

export function blockTask(
  db: Database.Database,
  taskId: number,
  reason: string,
): BlockResult {
  const block = db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "in_progress") {
      throw new Error(`Task ${taskId} is '${task.status}', only 'in_progress' tasks can be blocked`);
    }

    db.prepare(
      `UPDATE tasks SET status = 'blocked', blocked_reason = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(reason, taskId);

    db.prepare(
      `INSERT INTO progress_logs (task_id, agent_id, type, content)
       VALUES (?, ?, 'blocked', ?)`,
    ).run(taskId, task.assigned_agent, reason);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;
    return { task: updated };
  });

  return block();
}

// === getTaskContext ===

export function getTaskContext(db: Database.Database, taskId: number): ContextResult {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = db.prepare("SELECT * FROM phases WHERE id = ?").get(task.phase_id) as Phase;

  const logs = db
    .prepare("SELECT * FROM progress_logs WHERE task_id = ? ORDER BY created_at DESC")
    .all(taskId) as ProgressLog[];

  const dependencies = db
    .prepare(
      `SELECT t.id, t.title, t.status
       FROM task_dependencies td
       JOIN tasks t ON t.id = td.depends_on_task_id
       WHERE td.task_id = ?`,
    )
    .all(taskId) as Pick<Task, "id" | "title" | "status">[];

  const dependents = db
    .prepare(
      `SELECT t.id, t.title, t.status
       FROM task_dependencies td
       JOIN tasks t ON t.id = td.task_id
       WHERE td.depends_on_task_id = ?`,
    )
    .all(taskId) as Pick<Task, "id" | "title" | "status">[];

  return { task, phase, logs, dependencies, dependents };
}

// === addTask ===

export function addTask(
  db: Database.Database,
  phaseId: number,
  title: string,
  description?: string,
  dependsOn?: number[],
  position?: number,
): AddTaskResult {
  const add = db.transaction(() => {
    const phase = db.prepare("SELECT id FROM phases WHERE id = ?").get(phaseId) as
      | { id: number }
      | undefined;
    if (!phase) throw new Error(`Phase ${phaseId} not found`);

    const pos =
      position ??
      ((
        db
          .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE phase_id = ?")
          .get(phaseId) as { next_pos: number }
      ).next_pos);

    const result = db
      .prepare(
        `INSERT INTO tasks (phase_id, title, description, position)
         VALUES (?, ?, ?, ?)`,
      )
      .run(phaseId, title, description ?? null, pos);

    const taskId = result.lastInsertRowid as number;

    // Register dependencies with cycle detection
    if (dependsOn && dependsOn.length > 0) {
      const insertDep = db.prepare(
        "INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)",
      );
      for (const depId of dependsOn) {
        if (wouldCreateCycle(db, taskId, depId)) {
          throw new Error(`Adding dependency on task ${depId} would create a cycle`);
        }
        insertDep.run(taskId, depId);
      }
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;
    return { task };
  });

  return add();
}

// === listTasks ===

export function listTasks(
  db: Database.Database,
  filters: {
    project_id?: number;
    phase_id?: number;
    status?: string;
    assigned_agent?: string;
    include_archived?: boolean;
  },
): ListTasksResult {
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (!filters.include_archived) {
    conditions.push("p.archived = 0");
  }

  if (filters.phase_id != null) {
    conditions.push("t.phase_id = ?");
    params.push(filters.phase_id);
  }

  if (filters.project_id != null) {
    conditions.push("p.project_id = ?");
    params.push(filters.project_id);
  }

  if (filters.status) {
    conditions.push("t.status = ?");
    params.push(filters.status);
  }

  if (filters.assigned_agent) {
    conditions.push("t.assigned_agent = ?");
    params.push(filters.assigned_agent);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const tasks = db
    .prepare(
      `SELECT t.*
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       ${where}
       ORDER BY p."order", t.position`,
    )
    .all(...params) as Task[];

  return { tasks };
}
