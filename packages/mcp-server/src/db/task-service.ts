import type Database from "better-sqlite3";
import type {
  Task,
  Phase,
  ProgressLog,
  NextResult,
  ClaimResult,
  CompleteResult,
  BlockResult,
  ContextResult,
  AddTaskResult,
  ListTasksResult,
} from "@agent-board/shared";
import { getOrCreateDefaultProject } from "./project-service.js";
import { wouldCreateCycle } from "./cycle-detection.js";

/**
 * pending 상태이고 의존이 모두 해결된 태스크 목록을 반환한다.
 * @param db - SQLite 데이터베이스 인스턴스
 * @param projectId - 프로젝트 ID (미지정 시 기본 프로젝트)
 * @param agentId - 에이전트 ID (지정 시 해당 에이전트에 할당 가능한 태스크만 필터)
 * @returns 추천 태스크 목록 (최대 10개)
 */
export function getNextTasks(
  db: Database.Database,
  projectId?: number,
  agentId?: string,
): NextResult {
  const pid = projectId ?? getOrCreateDefaultProject(db);

  // NOT EXISTS 서브쿼리: 미완료(status != 'done') 의존이 하나라도 있으면 제외
  // → pending이면서 의존이 모두 해결된 태스크만 선택
  const baseQuery = `SELECT t.id, t.title, t.description, t.position, p.title AS phase_title
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ?
         AND p.archived = 0
         AND t.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM task_dependencies td
           JOIN tasks dep ON dep.id = td.depends_on_task_id
           WHERE td.task_id = t.id AND dep.status != 'done'
         )
       ORDER BY p."order", t.position
       LIMIT 10`;

  const filteredQuery = `SELECT t.id, t.title, t.description, t.position, p.title AS phase_title
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       WHERE p.project_id = ?
         AND p.archived = 0
         AND t.status = 'pending'
         AND (t.assigned_agent IS NULL OR t.assigned_agent = ?)
         AND NOT EXISTS (
           SELECT 1 FROM task_dependencies td
           JOIN tasks dep ON dep.id = td.depends_on_task_id
           WHERE td.task_id = t.id AND dep.status != 'done'
         )
       ORDER BY p."order", t.position
       LIMIT 10`;

  const recommended = agentId
    ? db.prepare(filteredQuery).all(pid, agentId) as NextResult["recommended"]
    : db.prepare(baseQuery).all(pid) as NextResult["recommended"];

  return { recommended };
}

/**
 * 태스크를 에이전트에게 할당한다 (status → in_progress).
 * @param db - SQLite 데이터베이스 인스턴스
 * @param taskId - 할당할 태스크 ID
 * @param agentId - 할당받을 에이전트 ID
 * @returns 업데이트된 태스크와 의존 완료 로그
 * @throws {Error} 태스크가 없거나 pending 상태가 아니거나 미해결 의존이 있을 때
 */
export function claimTask(
  db: Database.Database,
  taskId: number,
  agentId: string,
): ClaimResult {
  // 트랜잭션: 상태 검증 → 의존 검증 → status 업데이트 → 로그 기록 → 의존 완료 로그 조회
  const claim = db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "pending") {
      throw new Error(`Task ${taskId} is '${task.status}', only 'pending' tasks can be claimed`);
    }

    const unresolved = db
      .prepare(
        `SELECT dep.id, dep.title, dep.status
         FROM task_dependencies td
         JOIN tasks dep ON dep.id = td.depends_on_task_id
         WHERE td.task_id = ? AND dep.status != 'done'`,
      )
      .all(taskId) as Pick<Task, "id" | "title" | "status">[];

    if (unresolved.length > 0) {
      const names = unresolved.map((d) => `#${d.id} ${d.title} (${d.status})`).join(", ");
      throw new Error(`Task ${taskId} has unresolved dependencies: ${names}`);
    }

    db.prepare(
      `UPDATE tasks SET status = 'in_progress', assigned_agent = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(agentId, taskId);

    db.prepare(
      `INSERT INTO progress_logs (task_id, agent_id, type) VALUES (?, ?, 'started')`,
    ).run(taskId, agentId);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;

    const dependency_logs = db
      .prepare(
        `SELECT pl.* FROM progress_logs pl
         JOIN task_dependencies td ON td.depends_on_task_id = pl.task_id
         WHERE td.task_id = ? AND pl.type = 'completed'
         ORDER BY pl.created_at DESC`,
      )
      .all(taskId) as ProgressLog[];

    return { task: updated, dependency_logs };
  });

  return claim();
}

/**
 * 태스크를 완료 처리한다 (status → done).
 * @param db - SQLite 데이터베이스 인스턴스
 * @param taskId - 완료할 태스크 ID
 * @param content - 완료 로그 내용
 * @param filesChanged - 변경된 파일 목록
 * @returns 업데이트된 태스크, 새로 해제된 태스크 목록, Phase 진행률
 * @throws {Error} 태스크가 없거나 in_progress 상태가 아닐 때
 */
export function completeTask(
  db: Database.Database,
  taskId: number,
  content?: string,
  filesChanged?: string,
): CompleteResult {
  const complete = db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "in_progress") {
      throw new Error(`Task ${taskId} is '${task.status}', only 'in_progress' tasks can be completed`);
    }

    db.prepare(
      `UPDATE tasks SET status = 'done', updated_at = datetime('now') WHERE id = ?`,
    ).run(taskId);

    db.prepare(
      `INSERT INTO progress_logs (task_id, agent_id, type, content, files_changed)
       VALUES (?, ?, 'completed', ?, ?)`,
    ).run(taskId, task.assigned_agent, content ?? null, filesChanged ?? null);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;

    // 이 태스크 완료로 모든 의존이 해결된 pending 태스크를 찾는다
    // (완료된 태스크에 의존하면서, 다른 미완료 의존이 없는 태스크)
    const newly_unblocked = db
      .prepare(
        `SELECT t.id, t.title
         FROM tasks t
         JOIN task_dependencies td ON td.task_id = t.id
         WHERE td.depends_on_task_id = ?
           AND t.status = 'pending'
           AND NOT EXISTS (
             SELECT 1 FROM task_dependencies td2
             JOIN tasks dep ON dep.id = td2.depends_on_task_id
             WHERE td2.task_id = t.id AND dep.status != 'done'
           )`,
      )
      .all(taskId) as Pick<Task, "id" | "title">[];

    const phase_progress = db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
         FROM tasks WHERE phase_id = ?`,
      )
      .get(task.phase_id) as { total: number; done: number };

    return { task: updated, newly_unblocked, phase_progress };
  });

  return complete();
}

/**
 * 태스크에 블로커를 등록한다 (status → blocked).
 * @param db - SQLite 데이터베이스 인스턴스
 * @param taskId - 블로킹할 태스크 ID
 * @param reason - 블로커 사유
 * @returns 업데이트된 태스크
 * @throws {Error} 태스크가 없거나 in_progress 상태가 아닐 때
 */
export function blockTask(
  db: Database.Database,
  taskId: number,
  reason: string,
): BlockResult {
  const block = db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "in_progress") {
      throw new Error(`Task ${taskId} is '${task.status}', only 'in_progress' tasks can be blocked`);
    }

    db.prepare(
      `UPDATE tasks SET status = 'blocked', blocked_reason = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(reason, taskId);

    db.prepare(
      `INSERT INTO progress_logs (task_id, agent_id, type, content)
       VALUES (?, ?, 'blocked', ?)`,
    ).run(taskId, task.assigned_agent, reason);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;
    return { task: updated };
  });

  return block();
}

/**
 * 태스크 상세 정보를 조회한다 (태스크 + Phase + 로그 + 의존관계).
 * @param db - SQLite 데이터베이스 인스턴스
 * @param taskId - 조회할 태스크 ID
 * @returns 태스크, Phase, 진행 로그, 의존/피의존 태스크 목록
 * @throws {Error} 태스크가 없을 때
 */
export function getTaskContext(db: Database.Database, taskId: number): ContextResult {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = db.prepare("SELECT * FROM phases WHERE id = ?").get(task.phase_id) as Phase;

  const logs = db
    .prepare("SELECT * FROM progress_logs WHERE task_id = ? ORDER BY created_at DESC")
    .all(taskId) as ProgressLog[];

  const dependencies = db
    .prepare(
      `SELECT t.id, t.title, t.status
       FROM task_dependencies td
       JOIN tasks t ON t.id = td.depends_on_task_id
       WHERE td.task_id = ?`,
    )
    .all(taskId) as Pick<Task, "id" | "title" | "status">[];

  const dependents = db
    .prepare(
      `SELECT t.id, t.title, t.status
       FROM task_dependencies td
       JOIN tasks t ON t.id = td.task_id
       WHERE td.depends_on_task_id = ?`,
    )
    .all(taskId) as Pick<Task, "id" | "title" | "status">[];

  return { task, phase, logs, dependencies, dependents };
}

/**
 * 새 태스크를 추가한다.
 * @param db - SQLite 데이터베이스 인스턴스
 * @param phaseId - 소속 Phase ID
 * @param title - 태스크 제목
 * @param description - 태스크 설명
 * @param dependsOn - 의존 태스크 ID 배열 (순환 의존 시 에러)
 * @param position - 정렬 위치 (미지정 시 마지막)
 * @returns 생성된 태스크
 * @throws {Error} Phase가 없거나 순환 의존이 발생할 때
 */
export function addTask(
  db: Database.Database,
  phaseId: number,
  title: string,
  description?: string,
  dependsOn?: number[],
  position?: number,
): AddTaskResult {
  const add = db.transaction(() => {
    const phase = db.prepare("SELECT id FROM phases WHERE id = ?").get(phaseId) as
      | { id: number }
      | undefined;
    if (!phase) throw new Error(`Phase ${phaseId} not found`);

    const pos =
      position ??
      ((
        db
          .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE phase_id = ?")
          .get(phaseId) as { next_pos: number }
      ).next_pos);

    const result = db
      .prepare(
        `INSERT INTO tasks (phase_id, title, description, position)
         VALUES (?, ?, ?, ?)`,
      )
      .run(phaseId, title, description ?? null, pos);

    const taskId = result.lastInsertRowid as number;

    // Register dependencies with cycle detection
    if (dependsOn && dependsOn.length > 0) {
      const insertDep = db.prepare(
        "INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)",
      );
      for (const depId of dependsOn) {
        if (wouldCreateCycle(db, taskId, depId)) {
          throw new Error(`Adding dependency on task ${depId} would create a cycle`);
        }
        insertDep.run(taskId, depId);
      }
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;
    return { task };
  });

  return add();
}

/**
 * 필터 조건에 맞는 태스크 목록을 조회한다.
 * @param db - SQLite 데이터베이스 인스턴스
 * @param filters - 필터 조건 (project_id, phase_id, status, assigned_agent, include_archived)
 * @returns 필터된 태스크 배열
 */
export function listTasks(
  db: Database.Database,
  filters: {
    project_id?: number;
    phase_id?: number;
    status?: string;
    assigned_agent?: string;
    include_archived?: boolean;
  },
): ListTasksResult {
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (!filters.include_archived) {
    conditions.push("p.archived = 0");
  }

  if (filters.phase_id != null) {
    conditions.push("t.phase_id = ?");
    params.push(filters.phase_id);
  }

  if (filters.project_id != null) {
    conditions.push("p.project_id = ?");
    params.push(filters.project_id);
  }

  if (filters.status) {
    conditions.push("t.status = ?");
    params.push(filters.status);
  }

  if (filters.assigned_agent) {
    conditions.push("t.assigned_agent = ?");
    params.push(filters.assigned_agent);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const tasks = db
    .prepare(
      `SELECT t.*
       FROM tasks t
       JOIN phases p ON p.id = t.phase_id
       ${where}
       ORDER BY p."order", t.position`,
    )
    .all(...params) as Task[];

  return { tasks };
}

/**
 * 태스크를 삭제한다 (CASCADE로 의존관계, 로그도 함께 삭제).
 *
 * DB 스키마의 ON DELETE CASCADE 설정에 의존:
 * - task_dependencies.task_id / depends_on_task_id → tasks.id (CASCADE)
 * - progress_logs.task_id → tasks.id (CASCADE)
 *
 * @param db - SQLite 데이터베이스 인스턴스
 * @param taskId - 삭제할 태스크 ID
 * @returns 삭제 후 전체 tasks 목록 (소속 Phase가 이미 삭제된 경우 빈 배열)
 * @throws {Error} 태스크가 없을 때
 */
export function deleteTask(db: Database.Database, taskId: number): { tasks: Task[] } {
  const deleteOp = db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
    if (!task) throw new Error(`Task ${taskId} not found`);

    // CASCADE로 task_dependencies, progress_logs 자동 삭제
    db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);

    // 전체 tasks 반환
    const phase = db.prepare("SELECT project_id FROM phases WHERE id = ?").get(task.phase_id) as
      | { project_id: number }
      | undefined;
    if (!phase) {
      // phase가 삭제된 경우 빈 배열 반환
      return { tasks: [] };
    }

    const tasks = db
      .prepare(
        `SELECT t.* FROM tasks t
         JOIN phases p ON p.id = t.phase_id
         WHERE p.project_id = ?
         ORDER BY p."order", t.position`,
      )
      .all(phase.project_id) as Task[];

    return { tasks };
  });

  return deleteOp();
}
