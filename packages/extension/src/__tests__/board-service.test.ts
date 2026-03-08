import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initializeDatabase } from "@agent-board/mcp-server/db";
import { BoardService } from "../services/BoardService.js";

let db: Database.Database;
let service: BoardService;

function seed() {
  const projectId = db
    .prepare("INSERT INTO projects (name) VALUES ('Test Project')")
    .run().lastInsertRowid as number;
  const phase1Id = db
    .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 0)')
    .run(projectId, "Phase 1").lastInsertRowid as number;
  const phase2Id = db
    .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 1)')
    .run(projectId, "Phase 2").lastInsertRowid as number;
  return { projectId, phase1Id, phase2Id };
}

beforeEach(() => {
  db = new Database(":memory:");
  initializeDatabase(db);
  service = new BoardService(db);
});

afterEach(() => {
  db.close();
});

describe("getInitData", () => {
  it("should return empty phases and tasks for a new default project", () => {
    const result = service.getInitData();
    expect(result.phases).toHaveLength(0);
    expect(result.tasks).toHaveLength(0);
  });

  it("should return phases and tasks for a seeded project", () => {
    const { projectId, phase1Id } = seed();
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id);
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T2', 1)").run(phase1Id);

    const result = service.getInitData(projectId);
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].title).toBe("Phase 1");
    expect(result.phases[1].title).toBe("Phase 2");
    expect(result.tasks).toHaveLength(2);
  });

  it("should filter by specific project_id", () => {
    const { projectId, phase1Id } = seed();
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id);

    // Another project
    const p2 = db.prepare("INSERT INTO projects (name) VALUES ('Other')").run().lastInsertRowid as number;
    const ph2 = db.prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 0)').run(p2, "Other Phase").lastInsertRowid as number;
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'OtherTask', 0)").run(ph2);

    const result = service.getInitData(projectId);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("T1");
  });
});

describe("moveTask", () => {
  it("should move a task within the same phase", () => {
    const { phase1Id } = seed();
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id).lastInsertRowid as number;
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T2', 1)").run(phase1Id);

    const tasks = service.moveTask(t1, phase1Id, 1);
    const moved = tasks.find((t) => t.id === t1);
    expect(moved!.position).toBe(1);
    expect(moved!.phase_id).toBe(phase1Id);
  });

  it("should move a task to a different phase", () => {
    const { phase1Id, phase2Id } = seed();
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id).lastInsertRowid as number;

    const tasks = service.moveTask(t1, phase2Id, 0);
    const moved = tasks.find((t) => t.id === t1);
    expect(moved!.phase_id).toBe(phase2Id);
    expect(moved!.position).toBe(0);
  });

  it("should throw for non-existent task", () => {
    seed();
    expect(() => service.moveTask(999, 1, 0)).toThrow("Task 999 not found");
  });
});

describe("updateTaskStatus", () => {
  it("should update task status", () => {
    const { phase1Id } = seed();
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id).lastInsertRowid as number;

    const task = service.updateTaskStatus(taskId, "in_progress");
    expect(task.status).toBe("in_progress");
  });

  it("should allow any status transition (UI flexibility)", () => {
    const { phase1Id } = seed();
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'done', 0)").run(phase1Id).lastInsertRowid as number;

    // done → pending is allowed in UI (unlike MCP's strict transitions)
    const task = service.updateTaskStatus(taskId, "pending");
    expect(task.status).toBe("pending");
  });

  it("should throw for non-existent task", () => {
    expect(() => service.updateTaskStatus(999, "done")).toThrow("Task 999 not found");
  });
});

describe("updateTask", () => {
  it("should update a single field", () => {
    const { phase1Id } = seed();
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id).lastInsertRowid as number;

    const task = service.updateTask(taskId, { title: "Updated Title" });
    expect(task.title).toBe("Updated Title");
  });

  it("should update multiple fields", () => {
    const { phase1Id } = seed();
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id).lastInsertRowid as number;

    const task = service.updateTask(taskId, {
      title: "New Title",
      description: "New Desc",
      assigned_agent: "agent-1",
    });
    expect(task.title).toBe("New Title");
    expect(task.description).toBe("New Desc");
    expect(task.assigned_agent).toBe("agent-1");
  });

  it("should return unchanged task when no updates provided", () => {
    const { phase1Id } = seed();
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id).lastInsertRowid as number;

    const task = service.updateTask(taskId, {});
    expect(task.title).toBe("T1");
  });

  it("should throw for non-existent task", () => {
    expect(() => service.updateTask(999, { title: "X" })).toThrow("Task 999 not found");
  });
});
