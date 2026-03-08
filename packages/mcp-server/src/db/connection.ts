import Database from "better-sqlite3";
import { initializeDatabase } from "./schema.js";

let instance: Database.Database | null = null;

export function getDatabase(dbPath: string = "agent-board.db"): Database.Database {
  if (!instance) {
    instance = new Database(dbPath);
    initializeDatabase(instance);
  }
  return instance;
}

export function closeDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
