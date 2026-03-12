import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeDatabase } from "../db/schema.js";
import { executeBatch } from "../db/service.js";
import type { BatchOperation } from "@agent-board/shared";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  initializeDatabase(db);
  return db;
}

function seedProject(db: Database.Database) {
  const projectId = db
    .prepare("INSERT INTO projects (name) VALUES ('Test Project')")
    .run().lastInsertRowid as number;
  return { projectId };
}

describe("executeBatch", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = createTestDb();
  });

  it("should execute a single add_phase", () => {
    seedProject(db);
    const result = executeBatch(db, [{ type: "add_phase", title: "Phase A" }]);
    expect(result.total).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.results[0].type).toBe("add_phase");
    expect(result.results[0].id).toBeGreaterThan(0);
  });

  it("should resolve placeholder: add_phase → add_task(phase_id: '$0')", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase B" },
      { type: "add_task", phase_id: "$0", title: "Task 1" },
    ];
    const result = executeBatch(db, ops);
    expect(result.succeeded).toBe(2);

    const phaseId = result.results[0].id;
    const taskId = result.results[1].id;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as { phase_id: number };
    expect(task.phase_id).toBe(phaseId);
  });

  it("should resolve depends_on array placeholders", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase C" },
      { type: "add_task", phase_id: "$0", title: "Task A" },
      { type: "add_task", phase_id: "$0", title: "Task B" },
      { type: "add_task", phase_id: "$0", title: "Task C", depends_on: ["$1", "$2"] },
    ];
    const result = executeBatch(db, ops);
    expect(result.succeeded).toBe(4);

    const taskCId = result.results[3].id;
    const deps = db
      .prepare("SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ?")
      .all(taskCId) as Array<{ depends_on_task_id: number }>;
    expect(deps.map((d) => d.depends_on_task_id).sort()).toEqual(
      [result.results[1].id, result.results[2].id].sort(),
    );
  });

  it("should execute full workflow: phase → task → claim → complete", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase D" },
      { type: "add_task", phase_id: "$0", title: "Task X" },
      { type: "claim", task_id: "$1", agent_id: "agent-1" },
      { type: "complete", task_id: "$1", content: "Done!" },
    ];
    const result = executeBatch(db, ops);
    expect(result.succeeded).toBe(4);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.results[1].id) as {
      status: string;
      assigned_agent: string;
    };
    expect(task.status).toBe("done");
    expect(task.assigned_agent).toBe("agent-1");
  });

  it("should rollback all operations on failure", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase E" },
      { type: "add_task", phase_id: "$0", title: "Task Y" },
      // claim a pending task, then try to claim it again → error
      { type: "claim", task_id: "$1", agent_id: "agent-1" },
      { type: "claim", task_id: "$1", agent_id: "agent-2" },
    ];

    expect(() => executeBatch(db, ops)).toThrow();

    // Phase should not exist (rolled back)
    const phases = db.prepare("SELECT * FROM phases").all();
    expect(phases.length).toBe(0);
  });

  it("should throw on invalid placeholder format", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_task", phase_id: "abc", title: "Bad" },
    ];
    expect(() => executeBatch(db, ops)).toThrow("Invalid placeholder format");
  });

  it("should throw on future reference placeholder", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_task", phase_id: "$1", title: "Forward ref" },
      { type: "add_phase", title: "Phase F" },
    ];
    expect(() => executeBatch(db, ops)).toThrow("references future result");
  });

  it("should handle numeric IDs without placeholder resolution", () => {
    const { projectId } = seedProject(db);
    const phaseId = db
      .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 0)')
      .run(projectId, "Existing Phase").lastInsertRowid as number;

    const result = executeBatch(db, [
      { type: "add_task", phase_id: phaseId, title: "Direct ID task" },
    ]);
    expect(result.succeeded).toBe(1);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.results[0].id) as {
      phase_id: number;
    };
    expect(task.phase_id).toBe(phaseId);
  });

  it("should handle block operation", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase G" },
      { type: "add_task", phase_id: "$0", title: "Task Z" },
      { type: "claim", task_id: "$1", agent_id: "agent-1" },
      { type: "block", task_id: "$1", reason: "API 문서 부족" },
    ];
    const result = executeBatch(db, ops);
    expect(result.succeeded).toBe(4);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.results[1].id) as {
      status: string;
      blocked_reason: string;
    };
    expect(task.status).toBe("blocked");
    expect(task.blocked_reason).toBe("API 문서 부족");
  });

  it("should handle delete_phase operation", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase to Delete" },
      { type: "add_task", phase_id: "$0", title: "Task in Phase" },
      { type: "delete_phase", phase_id: "$0" },
    ];
    const result = executeBatch(db, ops);
    expect(result.succeeded).toBe(3);

    // Verify phase and task are deleted
    const phases = db.prepare("SELECT * FROM phases WHERE id = ?").all(result.results[0].id);
    expect(phases).toHaveLength(0);

    const tasks = db.prepare("SELECT * FROM tasks WHERE id = ?").all(result.results[1].id);
    expect(tasks).toHaveLength(0);
  });

  it("should handle delete_task operation", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase H" },
      { type: "add_task", phase_id: "$0", title: "Task to Delete" },
      { type: "delete_task", task_id: "$1" },
    ];
    const result = executeBatch(db, ops);
    expect(result.succeeded).toBe(3);

    // Verify task is deleted
    const tasks = db.prepare("SELECT * FROM tasks WHERE id = ?").all(result.results[1].id);
    expect(tasks).toHaveLength(0);
  });

  it("should handle delete operations with numeric IDs", () => {
    const { projectId } = seedProject(db);
    const phaseId = db
      .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 0)')
      .run(projectId, "Phase to Delete").lastInsertRowid as number;
    const taskId = db
      .prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'Task', 0)")
      .run(phaseId).lastInsertRowid as number;

    const result = executeBatch(db, [{ type: "delete_task", task_id: taskId }]);
    expect(result.succeeded).toBe(1);

    const tasks = db.prepare("SELECT * FROM tasks WHERE id = ?").all(taskId);
    expect(tasks).toHaveLength(0);
  });

  it("should rollback delete operations on error", () => {
    seedProject(db);
    const ops: BatchOperation[] = [
      { type: "add_phase", title: "Phase I" },
      { type: "add_task", phase_id: "$0", title: "Task" },
      { type: "delete_phase", phase_id: "$0" },
      { type: "delete_phase", phase_id: 999 }, // non-existent phase
    ];

    expect(() => executeBatch(db, ops)).toThrow();

    // Verify nothing was deleted (rollback)
    const phases = db.prepare("SELECT * FROM phases").all();
    expect(phases.length).toBe(0);
  });
});
