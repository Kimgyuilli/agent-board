import Database from "better-sqlite3";
import { initializeDatabase } from "./schema.js";

let instance: Database.Database | null = null;
let currentPath: string | null = null;

export function getDatabase(dbPath: string = "agent-board.db"): Database.Database {
  if (instance && currentPath === dbPath) {
    return instance;
  }
  if (instance) {
    instance.close();
    instance = null;
    currentPath = null;
  }
  instance = new Database(dbPath);
  instance.pragma("busy_timeout = 5000");
  initializeDatabase(instance);
  currentPath = dbPath;
  return instance;
}

export function closeDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
    currentPath = null;
  }
}
