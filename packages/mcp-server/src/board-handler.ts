import type Database from "better-sqlite3";
import type {
  RpcRequest,
  RpcResponse,
  BoardRpcMethod,
  BoardRpcMethods,
} from "@agent-board/shared";
import { RPC_ERROR } from "@agent-board/shared";
import type { Task } from "@agent-board/shared";
import {
  getOrCreateDefaultProject,
  archivePhase,
  listTasks,
  getChangesSince,
  getProgressLogs,
} from "./db/service.js";

// === RPC 핸들러 ===

type Handler<M extends BoardRpcMethod> = (
  db: Database.Database,
  params: BoardRpcMethods[M]["params"],
) => BoardRpcMethods[M]["result"];

const handlers: { [M in BoardRpcMethod]: Handler<M> } = {
  getInitData(db, params) {
    const pid = params.projectId ?? getOrCreateDefaultProject(db);

    const query = params.includeArchived
      ? `SELECT * FROM phases WHERE project_id = ? ORDER BY archived ASC, "order" ASC`
      : `SELECT * FROM phases WHERE project_id = ? AND archived = 0 ORDER BY "order" ASC`;

    const phases = db
      .prepare(query)
      .all(pid) as BoardRpcMethods["getInitData"]["result"]["phases"];

    const { tasks } = listTasks(db, {
      project_id: pid,
      include_archived: params.includeArchived,
    });
    return { phases, tasks };
  },

  archivePhase(db, params) {
    archivePhase(db, params.phaseId, params.archived);

    const pid = getOrCreateDefaultProject(db);
    const phases = db
      .prepare(`SELECT * FROM phases WHERE project_id = ? ORDER BY archived ASC, "order" ASC`)
      .all(pid) as BoardRpcMethods["archivePhase"]["result"]["phases"];

    const { tasks } = listTasks(db, { project_id: pid, include_archived: true });
    return { phases, tasks };
  },

  moveTask(db, params) {
    const { taskId, targetPhaseId, position } = params;

    const move = db.transaction(() => {
      const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
      if (!task) throw new Error(`Task ${taskId} not found`);

      db.prepare(
        `UPDATE tasks SET position = position + 1, updated_at = datetime('now')
         WHERE phase_id = ? AND position >= ? AND id != ?`,
      ).run(targetPhaseId, position, taskId);

      db.prepare(
        `UPDATE tasks SET phase_id = ?, position = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(targetPhaseId, position, taskId);

      const phase = db.prepare("SELECT project_id FROM phases WHERE id = ?").get(targetPhaseId) as
        | { project_id: number }
        | undefined;
      if (!phase) throw new Error(`Phase ${targetPhaseId} not found`);

      const { tasks } = listTasks(db, { project_id: phase.project_id });
      return { tasks };
    });

    return move();
  },

  updateTaskStatus(db, params) {
    const { taskId, status } = params;

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);

    db.prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      status,
      taskId,
    );

    return { task: db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task };
  },

  updateTask(db, params) {
    const { taskId, updates } = params;

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);

    const ALLOWED_FIELDS = ["title", "description", "assigned_agent"] as const;
    const setClauses: string[] = [];
    const sqlParams: (string | number | null)[] = [];

    for (const field of ALLOWED_FIELDS) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        sqlParams.push(updates[field] ?? null);
      }
    }

    if (setClauses.length === 0) return { task };

    setClauses.push("updated_at = datetime('now')");
    sqlParams.push(taskId);

    db.prepare(`UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ?`).run(...sqlParams);

    return { task: db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task };
  },

  getChanges(db, params) {
    return getChangesSince(db, params.since);
  },

  getProgressLogs(db, params) {
    const logs = getProgressLogs(db, params.taskId, params.limit);
    return { logs };
  },
};

// === JSON-RPC 디스패처 ===

export function dispatch(db: Database.Database, request: RpcRequest): RpcResponse {
  const { id, method, params } = request;

  if (!(method in handlers)) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: RPC_ERROR.METHOD_NOT_FOUND, message: `Unknown method: ${method}` },
    };
  }

  try {
    const handler = handlers[method as BoardRpcMethod] as (
      db: Database.Database,
      params: Record<string, unknown>,
    ) => unknown;
    const result = handler(db, params ?? {});
    return { jsonrpc: "2.0", id, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      jsonrpc: "2.0",
      id,
      error: { code: RPC_ERROR.SERVER_ERROR, message },
    };
  }
}
