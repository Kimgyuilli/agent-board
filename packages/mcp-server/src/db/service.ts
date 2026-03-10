// Barrel re-export — preserves existing import paths
export { getOrCreateDefaultProject, getProjectSummary } from "./project-service.js";
export { getNextTasks, claimTask, completeTask, blockTask, getTaskContext, addTask, listTasks } from "./task-service.js";
export { getChangesSince, getProgressLogs } from "./progress-service.js";
