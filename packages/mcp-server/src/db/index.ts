export { getDatabase, closeDatabase } from "./connection.js";
export { initializeDatabase } from "./schema.js";
export {
  getOrCreateDefaultProject,
  getProjectSummary,
  getNextTasks,
  claimTask,
  completeTask,
  blockTask,
  getTaskContext,
  addTask,
  listTasks,
} from "./service.js";
