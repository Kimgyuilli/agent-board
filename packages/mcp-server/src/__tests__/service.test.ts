import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeDatabase } from "../db/schema.js";
import {
  getOrCreateDefaultProject,
  getProjectSummary,
  getNextTasks,
  claimTask,
  completeTask,
  blockTask,
  getTaskContext,
  addTask,
  listTasks,
} from "../db/service.js";
import { wouldCreateCycle } from "../db/cycle-detection.js";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  initializeDatabase(db);
  return db;
}

/** Insert a project + phase and return their IDs */
function seedProjectAndPhase(db: Database.Database, phaseName = "Phase 1") {
  const projectId = db
    .prepare("INSERT INTO projects (name) VALUES ('Test Project')")
    .run().lastInsertRowid as number;
  const phaseId = db
    .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 0)')
    .run(projectId, phaseName).lastInsertRowid as number;
  return { projectId, phaseId };
}

describe("getOrCreateDefaultProject", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should create a default project when none exists", () => {
    const id = getOrCreateDefaultProject(db);
    expect(id).toBe(1);
    const row = db.prepare("SELECT name FROM projects WHERE id = ?").get(id) as { name: string };
    expect(row.name).toBe("Default Project");
  });

  it("should return existing project on subsequent calls", () => {
    const id1 = getOrCreateDefaultProject(db);
    const id2 = getOrCreateDefaultProject(db);
    expect(id1).toBe(id2);
  });
});

describe("getProjectSummary", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should return project summary with phase statistics", () => {
    const { projectId, phaseId } = seedProjectAndPhase(db);

    // Add tasks in various states
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'done', 0)").run(phaseId);
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'in_progress', 1)").run(phaseId);
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T3', 'pending', 2)").run(phaseId);

    const result = getProjectSummary(db, projectId);
    expect(result.project_name).toBe("Test Project");
    expect(result.phases).toHaveLength(1);
    expect(result.phases[0].total).toBe(3);
    expect(result.phases[0].done).toBe(1);
    expect(result.phases[0].in_progress).toBe(1);
    expect(result.active_tasks).toHaveLength(1); // only in_progress
    expect(result.active_tasks[0].title).toBe("T2");
  });

  it("should throw when project not found", () => {
    expect(() => getProjectSummary(db, 999)).toThrow("Project 999 not found");
  });

  it("should use default project when no id given", () => {
    const result = getProjectSummary(db);
    expect(result.project_name).toBe("Default Project");
    expect(result.phases).toHaveLength(0);
  });
});

describe("getNextTasks", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should return pending tasks with resolved dependencies", () => {
    const { projectId, phaseId } = seedProjectAndPhase(db);

    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'done', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'pending', 1)").run(phaseId).lastInsertRowid as number;
    const t3 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T3', 'pending', 2)").run(phaseId).lastInsertRowid as number;

    // T2 depends on T1 (done) → should appear
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t2, t1);
    // T3 depends on T2 (pending) → should NOT appear
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t3, t2);

    const result = getNextTasks(db, projectId);
    expect(result.recommended).toHaveLength(1);
    expect(result.recommended[0].id).toBe(t2);
  });

  it("should return tasks with no dependencies", () => {
    const { projectId, phaseId } = seedProjectAndPhase(db);
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'Standalone', 'pending', 0)").run(phaseId);

    const result = getNextTasks(db, projectId);
    expect(result.recommended).toHaveLength(1);
    expect(result.recommended[0].title).toBe("Standalone");
  });
});

describe("claimTask", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should claim a pending task and create a started log", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'pending', 0)").run(phaseId).lastInsertRowid as number;

    const result = claimTask(db, taskId, "agent-1");
    expect(result.task.status).toBe("in_progress");
    expect(result.task.assigned_agent).toBe("agent-1");

    const logs = db.prepare("SELECT * FROM progress_logs WHERE task_id = ?").all(taskId) as { type: string }[];
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe("started");
  });

  it("should reject claiming a non-pending task", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'in_progress', 0)").run(phaseId).lastInsertRowid as number;

    expect(() => claimTask(db, taskId, "agent-1")).toThrow("only 'pending' tasks can be claimed");
  });

  it("should reject claiming a task with unresolved dependencies", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'pending', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'pending', 1)").run(phaseId).lastInsertRowid as number;
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t2, t1);

    expect(() => claimTask(db, t2, "agent-1")).toThrow("unresolved dependencies");
  });

  it("should throw for non-existent task", () => {
    createTestDb(); // just ensure db exists
    expect(() => claimTask(db, 999, "agent-1")).toThrow("Task 999 not found");
  });
});

describe("completeTask", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should complete a task and record a log", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, status, assigned_agent, position) VALUES (?, 'T1', 'in_progress', 'agent-1', 0)").run(phaseId).lastInsertRowid as number;

    const result = completeTask(db, taskId, "Done!", "file1.ts");
    expect(result.task.status).toBe("done");
    expect(result.phase_progress.done).toBe(1);
    expect(result.phase_progress.total).toBe(1);

    const logs = db.prepare("SELECT * FROM progress_logs WHERE task_id = ?").all(taskId) as { type: string; content: string; files_changed: string }[];
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe("completed");
    expect(logs[0].content).toBe("Done!");
    expect(logs[0].files_changed).toBe("file1.ts");
  });

  it("should report newly unblocked tasks", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, status, assigned_agent, position) VALUES (?, 'T1', 'in_progress', 'agent-1', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'pending', 1)").run(phaseId).lastInsertRowid as number;
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t2, t1);

    const result = completeTask(db, t1);
    expect(result.newly_unblocked).toHaveLength(1);
    expect(result.newly_unblocked[0].id).toBe(t2);
  });

  it("should not unblock task with other pending dependencies", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, status, assigned_agent, position) VALUES (?, 'T1', 'in_progress', 'agent-1', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'pending', 1)").run(phaseId).lastInsertRowid as number;
    const t3 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T3', 'pending', 2)").run(phaseId).lastInsertRowid as number;
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t3, t1);
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t3, t2);

    const result = completeTask(db, t1);
    // T3 still depends on T2 (pending), so not unblocked
    expect(result.newly_unblocked).toHaveLength(0);
  });

  it("should reject completing a non-in_progress task", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'pending', 0)").run(phaseId).lastInsertRowid as number;

    expect(() => completeTask(db, taskId)).toThrow("only 'in_progress' tasks can be completed");
  });
});

describe("blockTask", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should block a task and record the reason", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, status, assigned_agent, position) VALUES (?, 'T1', 'in_progress', 'agent-1', 0)").run(phaseId).lastInsertRowid as number;

    const result = blockTask(db, taskId, "Waiting for API key");
    expect(result.task.status).toBe("blocked");
    expect(result.task.blocked_reason).toBe("Waiting for API key");

    const logs = db.prepare("SELECT * FROM progress_logs WHERE task_id = ?").all(taskId) as { type: string; content: string }[];
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe("blocked");
    expect(logs[0].content).toBe("Waiting for API key");
  });

  it("should reject blocking a non-in_progress task", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const taskId = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'pending', 0)").run(phaseId).lastInsertRowid as number;

    expect(() => blockTask(db, taskId, "reason")).toThrow("only 'in_progress' tasks can be blocked");
  });
});

describe("getTaskContext", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should return task with phase, logs, and dependencies", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'done', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'pending', 1)").run(phaseId).lastInsertRowid as number;
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t2, t1);
    db.prepare("INSERT INTO progress_logs (task_id, agent_id, type, content) VALUES (?, 'a1', 'completed', 'done')").run(t1);

    const result = getTaskContext(db, t2);
    expect(result.task.id).toBe(t2);
    expect(result.phase.title).toBe("Phase 1");
    expect(result.dependencies).toHaveLength(1);
    expect(result.dependencies[0].id).toBe(t1);

    const ctx1 = getTaskContext(db, t1);
    expect(ctx1.dependents).toHaveLength(1);
    expect(ctx1.dependents[0].id).toBe(t2);
    expect(ctx1.logs).toHaveLength(1);
  });

  it("should throw for non-existent task", () => {
    expect(() => getTaskContext(db, 999)).toThrow("Task 999 not found");
  });
});

describe("addTask", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should create a task with auto-incremented position", () => {
    const { phaseId } = seedProjectAndPhase(db);
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phaseId);

    const result = addTask(db, phaseId, "T2", "description");
    expect(result.task.title).toBe("T2");
    expect(result.task.description).toBe("description");
    expect(result.task.position).toBe(1); // auto-incremented
    expect(result.task.status).toBe("pending");
  });

  it("should register dependencies", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phaseId).lastInsertRowid as number;

    const result = addTask(db, phaseId, "T2", undefined, [t1]);
    const deps = db.prepare("SELECT * FROM task_dependencies WHERE task_id = ?").all(result.task.id) as { depends_on_task_id: number }[];
    expect(deps).toHaveLength(1);
    expect(deps[0].depends_on_task_id).toBe(t1);
  });

  it("should use explicit position when provided", () => {
    const { phaseId } = seedProjectAndPhase(db);
    const result = addTask(db, phaseId, "T1", undefined, undefined, 42);
    expect(result.task.position).toBe(42);
  });

  it("should throw for non-existent phase", () => {
    expect(() => addTask(db, 999, "T1")).toThrow("Phase 999 not found");
  });

  it("should reject circular dependencies via wouldCreateCycle", () => {
    const { phaseId } = seedProjectAndPhase(db);
    // Chain: T2 depends on T1
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = addTask(db, phaseId, "T2", undefined, [t1]).task.id;

    // wouldCreateCycle(taskId, dependsOnId): would adding taskId→dependsOnId create a cycle?
    // T1 depending on T2 would create: T1→T2→T1 (cycle)
    expect(wouldCreateCycle(db, t1, t2)).toBe(true);
    // T2 depending on T1 already exists, no new cycle from unrelated task
    expect(wouldCreateCycle(db, t2, t1)).toBe(false);
  });

  it("should reject transitive circular dependencies", () => {
    const { phaseId } = seedProjectAndPhase(db);
    // Chain: T1 ← T2 ← T3 (T3 depends on T2, T2 depends on T1)
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = addTask(db, phaseId, "T2", undefined, [t1]).task.id;
    const t3 = addTask(db, phaseId, "T3", undefined, [t2]).task.id;

    // T1 depending on T3 would create: T1→T3→T2→T1 (cycle)
    expect(wouldCreateCycle(db, t1, t3)).toBe(true);
    // T4 depending on T3 is fine (no cycle)
    expect(() => addTask(db, phaseId, "T4", undefined, [t3])).not.toThrow();
  });
});

describe("listTasks", () => {
  let db: Database.Database;
  beforeEach(() => { db = createTestDb(); });

  it("should return all tasks when no filter", () => {
    const { phaseId } = seedProjectAndPhase(db);
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'pending', 0)").run(phaseId);
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'done', 1)").run(phaseId);

    const result = listTasks(db, {});
    expect(result.tasks).toHaveLength(2);
  });

  it("should filter by status", () => {
    const { phaseId } = seedProjectAndPhase(db);
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'pending', 0)").run(phaseId);
    db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'done', 1)").run(phaseId);

    const result = listTasks(db, { status: "done" });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("T2");
  });

  it("should filter by assigned_agent", () => {
    const { phaseId } = seedProjectAndPhase(db);
    db.prepare("INSERT INTO tasks (phase_id, title, status, assigned_agent, position) VALUES (?, 'T1', 'in_progress', 'agent-1', 0)").run(phaseId);
    db.prepare("INSERT INTO tasks (phase_id, title, status, assigned_agent, position) VALUES (?, 'T2', 'in_progress', 'agent-2', 1)").run(phaseId);

    const result = listTasks(db, { assigned_agent: "agent-1" });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("T1");
  });

  it("should filter by phase_id", () => {
    const { projectId, phaseId: p1 } = seedProjectAndPhase(db, "Phase 1");
    const p2 = db.prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 1)').run(projectId, "Phase 2").lastInsertRowid as number;
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(p1);
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T2', 0)").run(p2);

    const result = listTasks(db, { phase_id: p2 });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("T2");
  });

  it("should filter by project_id", () => {
    const { projectId, phaseId } = seedProjectAndPhase(db);
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T1', 0)").run(phaseId);

    // Another project
    const p2 = db.prepare("INSERT INTO projects (name) VALUES ('Other')").run().lastInsertRowid as number;
    const ph2 = db.prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, 0)').run(p2, "Ph").lastInsertRowid as number;
    db.prepare("INSERT INTO tasks (phase_id, title, position) VALUES (?, 'T2', 0)").run(ph2);

    const result = listTasks(db, { project_id: projectId });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("T1");
  });
});

describe("full workflow: claim → complete → unblock", () => {
  it("should handle the full lifecycle", () => {
    const db = createTestDb();
    const { phaseId } = seedProjectAndPhase(db);

    // Create two tasks: T2 depends on T1
    const t1 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T1', 'pending', 0)").run(phaseId).lastInsertRowid as number;
    const t2 = db.prepare("INSERT INTO tasks (phase_id, title, status, position) VALUES (?, 'T2', 'pending', 1)").run(phaseId).lastInsertRowid as number;
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(t2, t1);

    // T2 should NOT be in next (blocked by T1)
    const next1 = getNextTasks(db, undefined);
    expect(next1.recommended.map((t) => t.id)).toContain(t1);
    expect(next1.recommended.map((t) => t.id)).not.toContain(t2);

    // Claim T1
    const claimed = claimTask(db, t1, "agent-1");
    expect(claimed.task.status).toBe("in_progress");

    // Complete T1 → T2 unblocked
    const completed = completeTask(db, t1, "All done");
    expect(completed.newly_unblocked).toHaveLength(1);
    expect(completed.newly_unblocked[0].id).toBe(t2);

    // Now T2 should appear in next
    const next2 = getNextTasks(db, undefined);
    expect(next2.recommended.map((t) => t.id)).toContain(t2);

    // Claim and block T2
    claimTask(db, t2, "agent-2");
    const blocked = blockTask(db, t2, "Missing config");
    expect(blocked.task.status).toBe("blocked");
    expect(blocked.task.blocked_reason).toBe("Missing config");

    db.close();
  });
});
