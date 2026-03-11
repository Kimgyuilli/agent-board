import type Database from "better-sqlite3";
import type { SyncResult, ArchivePhaseResult } from "@agent-board/shared";

const DEFAULT_PROJECT_NAME = "Default Project";

/**
 * 기본 프로젝트 ID를 반환한다. 프로젝트가 없으면 생성한다.
 * @param db - SQLite 데이터베이스 인스턴스
 * @returns 기본 프로젝트 ID
 */
export function getOrCreateDefaultProject(db: Database.Database): number {
  const row = db.prepare("SELECT id FROM projects LIMIT 1").get() as { id: number } | undefined;
  if (row) return row.id;

  const result = db
    .prepare("INSERT OR IGNORE INTO projects (name) VALUES (?)")
    .run(DEFAULT_PROJECT_NAME);
  if (result.changes > 0) return result.lastInsertRowid as number;

  return (db.prepare("SELECT id FROM projects LIMIT 1").get() as { id: number }).id;
}

/**
 * 새 Phase를 추가한다.
 * @param db - SQLite 데이터베이스 인스턴스
 * @param title - Phase 제목
 * @param projectId - 프로젝트 ID (미지정 시 기본 프로젝트)
 * @param order - 정렬 순서 (미지정 시 마지막)
 * @returns 생성된 Phase의 id, title, order
 * @throws {Error} 프로젝트가 없을 때
 */
export function addPhase(
  db: Database.Database,
  title: string,
  projectId?: number,
  order?: number,
): { id: number; title: string; order: number } {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(pid) as
    | { id: number }
    | undefined;
  if (!project) throw new Error(`Project ${pid} not found`);

  const pos =
    order ??
    ((
      db.prepare('SELECT COALESCE(MAX("order"), -1) + 1 AS next_ord FROM phases WHERE project_id = ?').get(pid) as {
        next_ord: number;
      }
    ).next_ord);

  const result = db
    .prepare('INSERT INTO phases (project_id, title, "order") VALUES (?, ?, ?)')
    .run(pid, title, pos);

  return { id: result.lastInsertRowid as number, title, order: pos };
}

/**
 * Phase를 아카이브하거나 아카이브를 해제한다.
 * @param db - SQLite 데이터베이스 인스턴스
 * @param phaseId - Phase ID
 * @param archived - true면 아카이브, false면 해제
 * @returns 변경된 Phase 정보
 * @throws {Error} Phase가 없거나 미완료 태스크가 있을 때 (아카이브 시)
 */
export function archivePhase(
  db: Database.Database,
  phaseId: number,
  archived: boolean,
): ArchivePhaseResult {
  const phase = db.prepare("SELECT * FROM phases WHERE id = ?").get(phaseId) as
    | { id: number; title: string; archived: number }
    | undefined;
  if (!phase) throw new Error(`Phase ${phaseId} not found`);

  if (archived) {
    const incomplete = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM tasks WHERE phase_id = ? AND status != 'done'`,
      )
      .get(phaseId) as { cnt: number };
    if (incomplete.cnt > 0) {
      throw new Error(
        `Cannot archive phase ${phaseId}: ${incomplete.cnt} task(s) not done`,
      );
    }
  }

  db.prepare("UPDATE phases SET archived = ?, updated_at = datetime('now') WHERE id = ?").run(archived ? 1 : 0, phaseId);

  return { phase_id: phaseId, archived: archived ? 1 : 0, title: phase.title };
}

/**
 * 프로젝트 요약을 조회한다 (Phase별 통계, 활성 태스크, 최근 로그).
 * @param db - SQLite 데이터베이스 인스턴스
 * @param projectId - 프로젝트 ID (미지정 시 기본 프로젝트)
 * @param includeArchived - 아카이브된 Phase 포함 여부
 * @returns 프로젝트명, Phase 통계, 활성 태스크, 최근 로그
 * @throws {Error} 프로젝트가 없을 때
 */
export function getProjectSummary(
  db: Database.Database,
  projectId?: number,
  includeArchived = false,
): SyncResult {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  const project = db.prepare("SELECT name FROM projects WHERE id = ?").get(pid) as
    | { name: string }
    | undefined;
  if (!project) throw new Error(`Project ${pid} not found`);

  const archiveFilter = includeArchived ? "" : "AND p.archived = 0";

  const phases = db
    .prepare(
      `SELECT p.title,
              COUNT(t.id) AS total,
              SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
              SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked
       FROM phases p
       LEFT JOIN tasks t ON t.phase_id = p.id
       WHERE p.project_id = ? ${archiveFilter}
       GROUP BY p.id
       ORDER BY p."order"`,
    )
    .all(pid) as SyncResult["phases"];

  const active_tasks = db
    .prepare(
      `SELECT t.id, t.title, t.status, t.assigned_agent
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ? AND t.status IN ('in_progress', 'blocked') ${archiveFilter}
       ORDER BY t.position`,
    )
    .all(pid) as SyncResult["active_tasks"];

  const recent_logs = db
    .prepare(
      `SELECT pl.type, pl.content, pl.created_at
       FROM progress_logs pl
       JOIN tasks t ON t.id = pl.task_id
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ? ${archiveFilter}
       ORDER BY pl.created_at DESC
       LIMIT 10`,
    )
    .all(pid) as SyncResult["recent_logs"];

  return { project_name: project.name, phases, active_tasks, recent_logs };
}
