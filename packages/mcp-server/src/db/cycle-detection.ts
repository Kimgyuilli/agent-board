import type Database from "better-sqlite3";

/**
 * BFS cycle detection: check if adding an edge (taskId -> dependsOnId)
 * would create a cycle in the dependency graph.
 */
export function wouldCreateCycle(
  db: Database.Database,
  taskId: number,
  dependsOnId: number,
): boolean {
  const visited = new Set<number>();
  const queue: number[] = [dependsOnId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = db
      .prepare("SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ?")
      .all(current) as { depends_on_task_id: number }[];

    for (const dep of deps) {
      if (!visited.has(dep.depends_on_task_id)) {
        queue.push(dep.depends_on_task_id);
      }
    }
  }

  return false;
}
