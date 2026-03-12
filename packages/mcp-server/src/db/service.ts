// Barrel re-export — preserves existing import paths
export { getOrCreateDefaultProject, getProjectSummary, addPhase, archivePhase, deletePhase } from "./project-service.js";
export { getNextTasks, claimTask, completeTask, blockTask, getTaskContext, addTask, listTasks, deleteTask } from "./task-service.js";
export { getChangesSince, getProgressLogs } from "./progress-service.js";
export { executeBatch } from "./batch-service.js";
