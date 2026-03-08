import type Database from "better-sqlite3";
import type { Phase, Task, TaskStatus } from "@agent-board/shared";
import { getOrCreateDefaultProject, listTasks } from "@agent-board/mcp-server/db";

export class BoardService {
  constructor(private readonly db: Database.Database) {}

  getInitData(projectId?: number): { phases: Phase[]; tasks: Task[] } {
    const pid = projectId ?? getOrCreateDefaultProject(this.db);

    const phases = this.db
      .prepare(
        `SELECT * FROM phases WHERE project_id = ? ORDER BY "order"`,
      )
      .all(pid) as Phase[];

    const { tasks } = listTasks(this.db, { project_id: pid });

    return { phases, tasks };
  }

  moveTask(taskId: number, targetPhaseId: number, position: number): Task[] {
    const move = this.db.transaction(() => {
      const task = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as
        | Task
        | undefined;
      if (!task) throw new Error(`Task ${taskId} not found`);

      // Shift tasks in target phase to make room
      this.db
        .prepare(
          `UPDATE tasks SET position = position + 1, updated_at = datetime('now')
           WHERE phase_id = ? AND position >= ? AND id != ?`,
        )
        .run(targetPhaseId, position, taskId);

      // Move the task
      this.db
        .prepare(
          `UPDATE tasks SET phase_id = ?, position = ?, updated_at = datetime('now')
           WHERE id = ?`,
        )
        .run(targetPhaseId, position, taskId);

      // Get the phase's project_id to return all tasks
      const phase = this.db.prepare("SELECT project_id FROM phases WHERE id = ?").get(targetPhaseId) as
        | { project_id: number }
        | undefined;
      if (!phase) throw new Error(`Phase ${targetPhaseId} not found`);

      const { tasks } = listTasks(this.db, { project_id: phase.project_id });
      return tasks;
    });

    return move();
  }

  updateTaskStatus(taskId: number, status: TaskStatus): Task {
    const task = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as
      | Task
      | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);

    this.db
      .prepare(
        `UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(status, taskId);

    return this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;
  }

  updateTask(
    taskId: number,
    updates: Partial<Pick<Task, "title" | "description" | "assigned_agent">>,
  ): Task {
    const task = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as
      | Task
      | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);

    const setClauses: string[] = [];
    const params: (string | null)[] = [];

    if (updates.title !== undefined) {
      setClauses.push("title = ?");
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push("description = ?");
      params.push(updates.description);
    }
    if (updates.assigned_agent !== undefined) {
      setClauses.push("assigned_agent = ?");
      params.push(updates.assigned_agent);
    }

    if (setClauses.length === 0) return task;

    setClauses.push("updated_at = datetime('now')");
    params.push(String(taskId));

    this.db
      .prepare(`UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ?`)
      .run(...params);

    return this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;
  }
}
