import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initializeDatabase } from "../db/schema.js";
import { dispatch } from "../board-handler.js";
import type { RpcRequest, RpcResponse } from "@agent-board/shared";
import { RPC_ERROR } from "@agent-board/shared";
import type { Task, Phase } from "@agent-board/shared";

let db: Database.Database;

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

function rpc(method: string, params: Record<string, unknown> = {}): RpcResponse {
  const request: RpcRequest = { jsonrpc: "2.0", id: 1, method, params };
  return dispatch(db, request);
}

function expectResult<T>(response: RpcResponse): T {
  expect("result" in response).toBe(true);
  return (response as { result: T }).result;
}

function expectError(response: RpcResponse): { code: number; message: string } {
  expect("error" in response && response.error).toBeTruthy();
  return (response as { error: { code: number; message: string } }).error;
}

beforeEach(() => {
  db = new Database(":memory:");
  initializeDatabase(db);
});

afterEach(() => {
  db.close();
});

describe("dispatch — getInitData", () => {
  it("should return empty phases and tasks for a new default project", () => {
    const result = expectResult<{ phases: Phase[]; tasks: Task[] }>(rpc("getInitData"));
    expect(result.phases).toHaveLength(0);
    expect(result.tasks).toHaveLength(0);
  });

  it("should return phases and tasks for a seeded project", () => {
    const { projectId, phase1Id } = seed();
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id);
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T2', 1)").run(phase1Id);

    const result = expectResult<{ phases: Phase[]; tasks: Task[] }>(
      rpc("getInitData", { projectId }),
    );
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].title).toBe("Phase 1");
    expect(result.phases[1].title).toBe("Phase 2");
    expect(result.tasks).toHaveLength(2);
  });

  it("should filter by specific projectId", () => {
    const { projectId, phase1Id } = seed();
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phase1Id);

    // Another project
    const p2 = db
      .prepare("INSERT INTO projects (name) VALUES ('Other')")
      .run().lastInsertRowid as number;
    const ph2 = db
      .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 0)')
      .run(p2, "Other Phase").lastInsertRowid as number;
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'OtherTask', 0)").run(ph2);

    const result = expectResult<{ phases: Phase[]; tasks: Task[] }>(
      rpc("getInitData", { projectId }),
    );
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("T1");
  });
});

describe("dispatch — moveTask", () => {
  it("should move a task within the same phase", () => {
    const { phase1Id } = seed();
    const t1 = db
      .prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)")
      .run(phase1Id).lastInsertRowid as number;
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T2', 1)").run(phase1Id);

    const result = expectResult<{ tasks: Task[] }>(
      rpc("moveTask", { taskId: t1, targetPhaseId: phase1Id, position: 1 }),
    );
    const moved = result.tasks.find((t) => t.id === t1);
    expect(moved!.position).toBe(1);
    expect(moved!.phase_id).toBe(phase1Id);
  });

  it("should move a task to a different phase", () => {
    const { phase1Id, phase2Id } = seed();
    const t1 = db
      .prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)")
      .run(phase1Id).lastInsertRowid as number;

    const result = expectResult<{ tasks: Task[] }>(
      rpc("moveTask", { taskId: t1, targetPhaseId: phase2Id, position: 0 }),
    );
    const moved = result.tasks.find((t) => t.id === t1);
    expect(moved!.phase_id).toBe(phase2Id);
    expect(moved!.position).toBe(0);
  });

  it("should return error for non-existent task", () => {
    seed();
    const error = expectError(rpc("moveTask", { taskId: 999, targetPhaseId: 1, position: 0 }));
    expect(error.message).toContain("Task 999 not found");
    expect(error.code).toBe(RPC_ERROR.SERVER_ERROR);
  });
});

describe("dispatch — updateTaskStatus", () => {
  it("should update task status", () => {
    const { phase1Id } = seed();
    const taskId = db
      .prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)")
      .run(phase1Id).lastInsertRowid as number;

    const result = expectResult<{ task: Task }>(
      rpc("updateTaskStatus", { taskId, status: "in_progress" }),
    );
    expect(result.task.status).toBe("in_progress");
  });

  it("should allow any status transition (UI flexibility)", () => {
    const { phase1Id } = seed();
    const taskId = db
      .prepare(
        "INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'done', 0)",
      )
      .run(phase1Id).lastInsertRowid as number;

    const result = expectResult<{ task: Task }>(
      rpc("updateTaskStatus", { taskId, status: "pending" }),
    );
    expect(result.task.status).toBe("pending");
  });

  it("should return error for non-existent task", () => {
    const error = expectError(rpc("updateTaskStatus", { taskId: 999, status: "done" }));
    expect(error.message).toContain("Task 999 not found");
  });
});

describe("dispatch — updateTask", () => {
  it("should update a single field", () => {
    const { phase1Id } = seed();
    const taskId = db
      .prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)")
      .run(phase1Id).lastInsertRowid as number;

    const result = expectResult<{ task: Task }>(
      rpc("updateTask", { taskId, updates: { title: "Updated Title" } }),
    );
    expect(result.task.title).toBe("Updated Title");
  });

  it("should update multiple fields", () => {
    const { phase1Id } = seed();
    const taskId = db
      .prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)")
      .run(phase1Id).lastInsertRowid as number;

    const result = expectResult<{ task: Task }>(
      rpc("updateTask", {
        taskId,
        updates: { title: "New Title", description: "New Desc", assigned_agent: "agent-1" },
      }),
    );
    expect(result.task.title).toBe("New Title");
    expect(result.task.description).toBe("New Desc");
    expect(result.task.assigned_agent).toBe("agent-1");
  });

  it("should return unchanged task when no updates provided", () => {
    const { phase1Id } = seed();
    const taskId = db
      .prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)")
      .run(phase1Id).lastInsertRowid as number;

    const result = expectResult<{ task: Task }>(rpc("updateTask", { taskId, updates: {} }));
    expect(result.task.title).toBe("T1");
  });

  it("should return error for non-existent task", () => {
    const error = expectError(rpc("updateTask", { taskId: 999, updates: { title: "X" } }));
    expect(error.message).toContain("Task 999 not found");
  });
});

describe("dispatch — error handling", () => {
  it("should return METHOD_NOT_FOUND for unknown method", () => {
    const error = expectError(rpc("unknownMethod"));
    expect(error.code).toBe(RPC_ERROR.METHOD_NOT_FOUND);
    expect(error.message).toContain("Unknown method");
  });

  it("should return correct JSON-RPC 2.0 envelope", () => {
    const response = rpc("getInitData");
    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
  });
});
