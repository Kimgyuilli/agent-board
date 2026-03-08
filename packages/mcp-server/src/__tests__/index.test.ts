import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initializeDatabase } from "../db/schema.js";
import { getDatabase, closeDatabase } from "../db/connection.js";

describe("initializeDatabase", () => {
  it("should create all 5 tables", () => {
    const db = new Database(":memory:");
    initializeDatabase(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("projects");
    expect(tableNames).toContain("phases");
    expect(tableNames).toContain("tasks");
    expect(tableNames).toContain("task_dependencies");
    expect(tableNames).toContain("progress_logs");

    db.close();
  });

  it("should be idempotent", () => {
    const db = new Database(":memory:");
    initializeDatabase(db);
    initializeDatabase(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    expect(tables.length).toBeGreaterThanOrEqual(5);
    db.close();
  });
});

describe("getDatabase / closeDatabase", () => {
  afterEach(() => {
    closeDatabase();
  });

  it("should return a singleton instance", () => {
    const db1 = getDatabase(":memory:");
    const db2 = getDatabase(":memory:");
    expect(db1).toBe(db2);
  });

  it("should allow reconnection after close", () => {
    const db1 = getDatabase(":memory:");
    closeDatabase();
    const db2 = getDatabase(":memory:");
    expect(db1).not.toBe(db2);
  });
});
