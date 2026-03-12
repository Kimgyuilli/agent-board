import type Database from "better-sqlite3";
import type { BatchOperation, BatchResult } from "@agent-board/shared";
import { addPhase, archivePhase, deletePhase } from "./project-service.js";
import { addTask, claimTask, completeTask, blockTask, deleteTask } from "./task-service.js";

/** Resolve a placeholder like "$0" to the ID from a previous result */
function resolveId(
  value: number | string,
  results: Array<{ index: number; type: string; id: number }>,
  currentIndex: number,
): number {
  if (typeof value === "number") return value;
  const match = /^\$(\d+)$/.exec(value);
  if (!match) throw new Error(`Invalid placeholder format: "${value}"`);
  const refIndex = Number(match[1]);
  if (refIndex >= currentIndex) {
    throw new Error(`Operation ${currentIndex} references future result $${refIndex}`);
  }
  const ref = results.find((r) => r.index === refIndex);
  if (!ref) throw new Error(`Placeholder $${refIndex} has no result`);
  return ref.id;
}

function resolveIdArray(
  values: Array<number | string>,
  results: Array<{ index: number; type: string; id: number }>,
  currentIndex: number,
): number[] {
  return values.map((v) => resolveId(v, results, currentIndex));
}

/**
 * 여러 작업을 단일 트랜잭션으로 일괄 실행한다.
 * @param db - SQLite 데이터베이스 인스턴스
 * @param operations - 실행할 작업 배열 ($N placeholder로 이전 결과 ID 참조 가능)
 * @returns 각 작업의 결과 (index, type, id)와 실행 통계
 * @throws {Error} 알 수 없는 작업 타입이거나 placeholder 참조 오류 시
 */
export function executeBatch(
  db: Database.Database,
  operations: BatchOperation[],
): BatchResult {
  const results: BatchResult["results"] = [];

  const run = db.transaction(() => {
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      let id: number;

      switch (op.type) {
        case "add_phase": {
          const projectId = op.project_id != null ? resolveId(op.project_id, results, i) : undefined;
          const result = addPhase(db, op.title, projectId, op.order);
          id = result.id;
          break;
        }
        case "add_task": {
          const phaseId = resolveId(op.phase_id, results, i);
          const dependsOn = op.depends_on ? resolveIdArray(op.depends_on, results, i) : undefined;
          const result = addTask(db, phaseId, op.title, op.description, dependsOn, op.position);
          id = result.task.id;
          break;
        }
        case "archive_phase": {
          const phaseId = resolveId(op.phase_id, results, i);
          const result = archivePhase(db, phaseId, op.archived);
          id = result.phase_id;
          break;
        }
        case "claim": {
          const taskId = resolveId(op.task_id, results, i);
          const result = claimTask(db, taskId, op.agent_id);
          id = result.task.id;
          break;
        }
        case "complete": {
          const taskId = resolveId(op.task_id, results, i);
          const result = completeTask(db, taskId, op.content, op.files_changed);
          id = result.task.id;
          break;
        }
        case "block": {
          const taskId = resolveId(op.task_id, results, i);
          const result = blockTask(db, taskId, op.reason);
          id = result.task.id;
          break;
        }
        case "delete_phase": {
          const phaseId = resolveId(op.phase_id, results, i);
          deletePhase(db, phaseId);
          id = phaseId;
          break;
        }
        case "delete_task": {
          const taskId = resolveId(op.task_id, results, i);
          deleteTask(db, taskId);
          id = taskId;
          break;
        }
        default:
          throw new Error(`Unknown operation type: ${(op as { type: string }).type}`);
      }

      results.push({ index: i, type: op.type, id });
    }
  });

  run();
  return { results, total: operations.length, succeeded: results.length };
}
