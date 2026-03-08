import type Database from "better-sqlite3";
import type {
  Task,
  Phase,
  ProgressLog,
  SyncResult,
  NextResult,
  ClaimResult,
  CompleteResult,
  BlockResult,
  ContextResult,
  AddTaskResult,
  ListTasksResult,
} from "@agent-board/shared";

const DEFAULT_PROJECT_NAME = "Default Project";

// === getOrCreateDefaultProject ===

export function getOrCreateDefaultProject(db: Database.Database): number {
  const row = db.prepare("SELECT id FROM projects LIMIT 1").get() as { id: number } | undefined;
  if (row) return row.id;

  const result = db
    .prepare("INSERT INTO projects (name) VALUES (?)")
    .run(DEFAULT_PROJECT_NAME);
  return result.lastInsertRowid as number;
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

// === getNextTasks (next) ===

export function getNextTasks(
  db: Database.Database,
  projectId?: number,
  agentId?: string,
): NextResult {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  // pending tasks with all dependencies resolved (done)
  const params: (number | string)[] = [pid];
  let agentFilter = "";
  if (agentId) {
    agentFilter = "AND (t.assigned_agent IS NULL OR t.assigned_agent = ?)";
    params.push(agentId);
  }

  const recommended = db
    .prepare(
      `SELECT t.id, t.title, t.description, t.position, p.title AS phase_title
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ?
         AND t.status = 'pending'
         ${agentFilter}
         AND NOT EXISTS (
           SELECT 1 FROM task_dependencies td
           JOIN tasks dep ON dep.id = td.depends_on_task_id
           WHERE td.task_id = t.id AND dep.status != 'done'
         )
       ORDER BY p."order", t.position
       LIMIT 10`,
    )
    .all(...params) as NextResult["recommended"];

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

    // Check all dependencies are done
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

    // Find newly unblocked tasks: pending tasks whose ALL dependencies are now done
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

    // Phase progress
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
    // Verify phase exists
    const phase = db.prepare("SELECT id FROM phases WHERE id = ?").get(phaseId) as
      | { id: number }
      | undefined;
    if (!phase) throw new Error(`Phase ${phaseId} not found`);

    // Calculate position if not provided
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

    // Register dependencies
    if (dependsOn && dependsOn.length > 0) {
      const insertDep = db.prepare(
        "INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)",
      );
      for (const depId of dependsOn) {
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
  },
): ListTasksResult {
  const conditions: string[] = [];
  const params: (number | string)[] = [];

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
