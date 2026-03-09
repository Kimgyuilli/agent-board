# 진행 기록

> 최신 항목이 위로 오도록 역순으로 작성한다.

## 2026-03-09 07:00 — backend-dev (Phase 3.5 완료)
### 완료한 작업
- Extension↔MCP Server 프로세스 분리 (7개 태스크 완료)
  - `packages/shared/src/ipc.ts`: JSON-RPC 2.0 타입 + BoardRpcMethods 메서드 맵 정의
  - `packages/mcp-server/src/board-handler.ts`: RPC 디스패치 로직 (핸들러 4개: getInitData, moveTask, updateTaskStatus, updateTask)
  - `packages/mcp-server/src/board-server.ts`: stdin/stdout ndjson 서버 엔트리포인트 (--db 플래그, readline, graceful shutdown)
  - `packages/extension/src/services/ProcessManager.ts`: child_process 생명주기 관리 (spawn/kill/restart, 자동 재시작 최대 3회)
  - `packages/extension/src/services/BoardClient.ts`: IBoardService 인터페이스 + JSON-RPC 클라이언트 (pending 요청 Map, 10초 타임아웃)
  - `packages/extension/src/extension.ts`: DB 직접 import 제거, BoardClient 사용으로 전환
  - `packages/extension/src/panels/BoardPanel.ts`: IBoardService 인터페이스 타입 사용
  - `packages/extension/package.json`: better-sqlite3, @agent-board/mcp-server 의존성 제거, --external:better-sqlite3 제거, prebuild에 board-server.js 복사 추가
- 삭제 파일: `packages/extension/src/services/BoardService.ts` (BoardClient로 대체)
- 테스트: 55/55 통과 (기존 48 → board-handler 15개 추가, board-client 5개 추가, board-service 13개 제거)
- lint 클린, 4개 패키지 빌드 성공
### 다음 할 일
- Phase 4 시작: @dnd-kit 드래그앤드롭, 태스크 상태 변경 UI, 상세 패널, 양방향 동기화
### 이슈/참고
- **아키텍처**: Extension(Electron) → child_process(시스템 Node.js)로 IPC 분리. better-sqlite3 ABI 충돌 근본 해결
- **IPC 프로토콜**: Newline-Delimited JSON-RPC 2.0 over stdio
- **모듈 분리**: board-handler.ts(디스패치 로직) + board-server.ts(I/O 배선) 분리로 단위 테스트 용이
- **IBoardService 인터페이스**: 동기→비동기 전환. BoardPanel은 인터페이스만 참조하므로 테스트 시 mock 가능
- Extension 번들 11.4kb (네이티브 모듈 의존 없음), board-server 7.9kb (별도 프로세스)

## 2026-03-09 06:25 — backend-dev (네이티브 모듈 이슈 대응)
### 완료한 작업
- better-sqlite3 v11→v12 업그레이드 (Electron 39 호환)
- VS Build Tools + electron-rebuild로 Extension 수동 테스트 성공
- 테스트 복구: `pnpm install --force`로 시스템 Node용 바이너리 복원 (48/48 통과)
- Extension CJS 호환: `"type": "module"` 제거
- Activity Bar 아이콘: SVG 파일 경로로 수정
### 다음 할 일
- Phase 3.5: Extension↔MCP Server 프로세스 분리 (better-sqlite3 네이티브 모듈 Electron/Node ABI 충돌 근본 해결)
### 이슈/참고
- **근본 원인**: better-sqlite3는 C++ 네이티브 모듈. Electron(ABI 140)과 시스템 Node(ABI 127)가 동일 바이너리를 공유할 수 없음
- **현재 상태**: `pnpm install`은 Node용, `electron-rebuild`는 Electron용. 테스트↔Extension 실행 시 전환 필요
- **해결 방향**: Extension에서 better-sqlite3 직접 import 제거 → MCP Server를 child_process로 분리하여 시스템 Node에서 실행

## 2026-03-09 05:40 — frontend-dev (Phase 3 완료)
### 완료한 작업
- 칸반 보드 UI 구현 (6개 신규 파일 + 2개 수정)
  - `packages/webview/src/hooks/useBoardData.ts`: 데이터 페칭 훅
    - init-data, tasks-updated (부분/전체 머지), phases-updated 핸들링
    - useCallback으로 무한 리렌더 방지, 함수형 state 업데이트
    - 마운트 시 request-refresh 호출
  - `packages/webview/src/components/KanbanBoard.tsx`: 가로 스크롤 보드
    - useMemo로 tasks를 phase_id별 그룹핑 + position 정렬
    - phases를 order 순 정렬
  - `packages/webview/src/components/PhaseColumn.tsx`: Phase 컬럼
    - 헤더 (title + 태스크 수 뱃지), 세로 스크롤 태스크 리스트
  - `packages/webview/src/components/TaskCard.tsx`: Task 카드
    - title, #id, StatusBadge, description (2줄 clamp), assigned_agent, blocked_reason
  - `packages/webview/src/components/StatusBadge.tsx`: 상태 뱃지 (pending/in_progress/done/blocked)
  - `packages/webview/src/components/EmptyState.tsx`: 빈 상태 안내
  - `packages/webview/src/App.tsx`: useBoardData + 조건부 렌더링 (loading/empty/board)
  - `packages/webview/src/index.css`: VS Code CSS 변수 기반 스타일 (Tailwind 색상 미사용)
- 검증: 빌드 성공, 48/48 테스트 통과
### 다음 할 일
- Phase 4 시작: @dnd-kit 드래그앤드롭, 태스크 상태 변경 UI, 상세 패널
### 이슈/참고
- 모든 색상은 VS Code CSS 변수(`--vscode-*`)만 사용하여 light/dark/high-contrast 자동 지원
- tasks-updated 메시지: 1개=부분 업데이트(ID 매칭 머지), 2개+=전체 교체

## 2026-03-09 01:35 — backend-dev (Phase 2 완료)
### 완료한 작업
- MCP Server DB 공개 API (`packages/mcp-server/src/db/index.ts`)
  - 배럴 파일: connection, schema, service의 모든 public 함수 재수출
  - `package.json`에 `exports` 맵 추가 (`.`, `./db`)
  - `connection.ts`에 `busy_timeout = 5000` pragma 추가 (동시 접근 안전)
- Extension 빌드 설정 (`packages/extension/package.json`)
  - 의존성: `@agent-board/mcp-server: workspace:*`, `better-sqlite3`, `@types/better-sqlite3`
  - `prebuild` 스크립트: webview dist → extension dist/webview 복사
  - esbuild: `--external:better-sqlite3` 추가
- BoardService 서비스 레이어 (`packages/extension/src/services/BoardService.ts`)
  - `getInitData(projectId?)`: Phase 목록 + Task 목록 조회
  - `moveTask(taskId, targetPhaseId, position)`: 트랜잭션, position 재정렬
  - `updateTaskStatus(taskId, status)`: UI용 유연한 상태 변경
  - `updateTask(taskId, updates)`: 동적 SET 절 빌드
- BoardPanel 리팩토링 (`packages/extension/src/panels/BoardPanel.ts`)
  - 생성자: `_extensionUri`, `_webviewDistUri`, `_service` 3개 파라미터
  - 메시지 핸들러: request-refresh, move-task, update-task-status, update-task
  - HTML: Vite 번들 로드 (assets/index.js, assets/index.css), CSP에 font-src 추가
  - try-catch 중앙 에러 처리 → `vscode.window.showErrorMessage()`
- Extension 진입점 (`packages/extension/src/extension.ts`)
  - `activate()`: DB 경로 결정 → getDatabase() → BoardService → BoardPanelProvider
  - `deactivate()`: closeDatabase() 호출
  - DB 경로: workspace/.agent-board/board.db 또는 globalStorage/board.db
- BoardService 단위 테스트 (`packages/extension/src/__tests__/board-service.test.ts`)
  - 13개 테스트 케이스 (전체 48개 = 기존 35 + 신규 13)
  - getInitData: 빈 프로젝트 / 시드 데이터 / 특정 project_id
  - moveTask: 같은 Phase / 다른 Phase / 존재하지 않는 task
  - updateTaskStatus: 정상 변경 / 유연한 상태 전이 / 존재하지 않는 task
  - updateTask: 단일/복수 필드 / 빈 업데이트 / 존재하지 않는 task
- 검증: lint 클린, 48/48 테스트 통과, 4개 패키지 빌드 성공
### 다음 할 일
- Phase 3 시작: Webview 칸반 보드 UI (Phase 컬럼, Task 카드, 데이터 바인딩)
### 이슈/참고
- Extension(CJS) ↔ mcp-server(ESM) 호환: esbuild가 ESM→CJS 자동 변환
- better-sqlite3 네이티브 모듈: esbuild external로 제외
- Webview 번들: prebuild에서 dist/webview/로 복사, asWebviewUri()로 URI 변환
- BoardService는 MCP 서비스와 역할 분리 (UI용 유연한 상태 변경 vs 에이전트용 엄격한 전이)

## 2026-03-09 01:11 — backend-dev (Phase 1 완료)
### 완료한 작업
- DB 서비스 레이어 구현 (`packages/mcp-server/src/db/service.ts`)
  - `getOrCreateDefaultProject`: 기본 프로젝트 조회/생성
  - `getProjectSummary`: sync용 프로젝트 + Phase별 통계 + 활성 태스크 + 최근 로그
  - `getNextTasks`: pending이면서 의존 해결된 태스크 목록 (next)
  - `claimTask`: 상태→in_progress, assigned_agent 설정, 시작 로그 (트랜잭션)
  - `completeTask`: 상태→done, 완료 로그, 새로 unblock된 태스크 반환 (트랜잭션)
  - `blockTask`: 상태→blocked, 사유 기록 (트랜잭션)
  - `getTaskContext`: 태스크 + Phase + 로그 + 의존관계 상세
  - `addTask`: INSERT + 의존관계 등록 + auto position (트랜잭션)
  - `listTasks`: 필터(project_id, phase_id, status, assigned_agent) 조건 조회
- MCP 도구 핸들러 연결 (`packages/mcp-server/src/index.ts`)
  - 8개 도구 stub → 서비스 함수 호출로 교체
  - try-catch + isError 플래그 에러 핸들링
  - JSON 직렬화 응답
- 서비스 레이어 단위 테스트 (`packages/mcp-server/src/__tests__/service.test.ts`)
  - 29개 테스트 케이스 (전체 33개 = 기존 4 + 신규 29)
  - 전체 워크플로우 테스트: claim → complete → unblock 흐름
  - 에러 케이스: 존재하지 않는 엔티티, 잘못된 상태 전이, 미해결 의존관계
- 검증: lint 클린, 33/33 테스트 통과, 빌드 성공 (14.3kb)
### 다음 할 일
- Phase 2 시작: Extension ↔ MCP Server 연결, Webview UI 구현
### 이슈/참고
- 모든 상태 변경 함수(claim, complete, block, addTask)는 `db.transaction()` 사용
- parameterized queries로 SQL injection 방지
- `getNextTasks`는 모든 의존관계가 done인 pending 태스크만 반환

## 2026-03-08 21:30 — backend-dev (Phase 0 완료)
### 완료한 작업
- Webview 패키지 스캐폴딩 (`packages/webview/`)
  - `index.html`: Vite 엔트리 HTML
  - `vite.config.ts`: React 플러그인, 고정 출력 파일명 (해시 없음)
  - `tailwind.config.ts` + `postcss.config.ts`: Tailwind CSS v3 설정
  - `src/index.css`: Tailwind directives
  - `src/App.tsx`: VS Code 테마 변수 기반 레이아웃 (header + main)
  - `src/hooks/useVSCodeApi.ts`: acquireVsCodeApi 싱글톤 + postMessage/onMessage 훅
  - `src/main.tsx`: App 컴포넌트 분리 + CSS import
  - `package.json`: @dnd-kit/core, @dnd-kit/sortable, tailwindcss, postcss, autoprefixer 추가
- 훅(Hook) 설정
  - `.claude/settings.json`: TeammateIdle + TaskCompleted 훅 등록
  - `.claude/hooks/quality-gate.sh`: lint + test 실행
  - `.claude/hooks/verify-completion.sh`: lint + test + tsc --noEmit 실행
  - `.gitignore` 수정: .claude/settings.json, .claude/hooks/ 추적 허용
- 루트 `package.json` lint 스크립트 수정: `eslint packages/*/src/` → `pnpm -r run lint` (Windows 호환)
- 검증: lint 클린, 6/6 테스트 통과, 4개 패키지 모두 빌드 성공
### 다음 할 일
- Phase 1 시작: MCP 도구 실제 구현 (DB 서비스 레이어)
### 이슈/참고
- Phase 0 전체 완료 (8/8 태스크 done)
- `.claude/*` gitignore 패턴에서 settings.json과 hooks/만 예외 처리

## 2026-03-08 21:15 — backend-dev (MCP Server 패키지 스캐폴딩)
### 완료한 작업
- MCP Server 패키지 스캐폴딩 완료 (`packages/mcp-server/`)
  - `package.json`: zod ^3.23.0 의존성 추가
  - `src/db/schema.ts`: SQLite 스키마 정의 (5개 테이블)
    - projects, phases, tasks, task_dependencies, progress_logs
    - PRAGMA journal_mode=WAL, foreign_keys=ON
    - CHECK 제약조건 (status, type 값 검증)
    - 인덱스: idx_tasks_phase_status, idx_progress_logs_task
    - `initializeDatabase()` 함수: db.exec(SCHEMA_SQL)
  - `src/db/connection.ts`: 싱글톤 DB 커넥션 관리
    - `getDatabase(dbPath)`: 인스턴스 생성 + 스키마 초기화
    - `closeDatabase()`: 커넥션 종료
  - `src/index.ts`: MCP 서버 초기화 + 8개 도구 등록
    - @modelcontextprotocol/sdk/server/mcp.js → McpServer
    - @modelcontextprotocol/sdk/server/stdio.js → StdioServerTransport
    - Zod 스키마로 입력 검증 (shared 타입과 일치)
    - 8개 도구 stub: sync, next, claim, complete, block, context, add_task, list_tasks
    - main() 함수: StdioServerTransport로 서버 연결
  - `src/__tests__/index.test.ts`: DB 레이어 테스트 (4개)
    - initializeDatabase: 5개 테이블 생성 + 멱등성 확인
    - getDatabase/closeDatabase: 싱글톤 패턴 + 재연결 테스트
- ESM 스타일 임포트 (`.js` 확장자) 사용
- PLAN.md 업데이트: mcp-server 패키지 스캐폴딩 `done` 처리
### 다음 할 일
- 훅(Hook) 설정 (Teammate Idle + Task Completed)
- webview 패키지 스캐폴딩 (frontend-dev 담당)
- MCP 도구 실제 구현 (DB 쿼리 로직 추가)
### 이슈/참고
- MCP 도구 핸들러는 현재 "not implemented" 텍스트 응답만 반환
- 실제 비즈니스 로직은 다음 Phase에서 구현 예정
- DB 스키마는 shared/models.ts와 일치하도록 설계됨

## 2026-03-08 20:45 — backend-dev (Extension 패키지 스캐폴딩)
### 완료한 작업
- Extension 패키지 스캐폴딩 완료 (`packages/extension/`)
  - `package.json`: activationEvents, contributes 설정 (commands, viewsContainers, views)
    - Activity Bar에 Agent Board 뷰 컨테이너 추가 (icon: layout-sidebar-left)
    - Webview view `agent-board.boardView` 등록
    - Command `agent-board.showBoard` 추가
  - `src/panels/BoardPanel.ts`: BoardPanelProvider 구현 (~95줄)
    - `vscode.WebviewViewProvider` 인터페이스 구현
    - `resolveWebviewView()`: webview 옵션 설정 (enableScripts, localResourceRoots)
    - `_getHtmlForWebview()`: nonce 기반 CSP 적용한 HTML 생성 (placeholder 콘텐츠)
    - `postMessage()`: 타입 안전한 Extension → Webview 메시지 전송
    - `onDidReceiveMessage()`: Webview → Extension 메시지 핸들러 (stub)
    - `@agent-board/shared`의 ExtensionToWebviewMessage, WebviewToExtensionMessage 타입 활용
  - `src/extension.ts`: activate() 함수 구현
    - BoardPanelProvider 인스턴스 생성 및 등록
    - `vscode.window.registerWebviewViewProvider()` 호출
    - `agent-board.showBoard` 커맨드 등록
    - Disposable 패턴 적용 (context.subscriptions.push)
- ESM 스타일 임포트 (`.js` 확장자) 사용
### 다음 할 일
- mcp-server 패키지 스캐폴딩 (MCP SDK, better-sqlite3 설정)
- 훅(Hook) 설정 (Teammate Idle + Task Completed)
- webview 패키지 스캐폴딩 (frontend-dev 담당)
### 이슈/참고
- CSP 설정: `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'`
- 실제 webview 번들은 webview 패키지 완성 후 연결 예정

## 2026-03-08 — backend-dev (Phase 0 병렬 태스크)
### 완료한 작업
- 공유 타입 정의 (`packages/shared/`)
  - `src/models.ts`: DB 모델 타입 (Project, Phase, Task, ProgressLog, TaskDependency)
  - `src/messages.ts`: Extension ↔ Webview 메시지 프로토콜 (discriminated union)
  - `src/mcp.ts`: MCP 도구 파라미터/결과 타입 (sync, next, claim, complete, block, context, add_task, list_tasks)
  - `src/index.ts`: 배럴 export
  - 각 패키지 package.json에 `@agent-board/shared: workspace:*` 추가
- ESLint + Prettier 설정
  - `eslint.config.js`: flat config, typescript-eslint, React 플러그인, prettier 연동
  - `.prettierrc`: semi, doubleQuote, tabWidth 2, trailingComma all, printWidth 100
  - `.prettierignore`: dist/, node_modules/, pnpm-lock.yaml
  - `_` prefix로 unused vars 허용 규칙 추가
- Vitest 설정
  - `vitest.config.ts`: root config with `test.projects` (workspace 모드)
  - 각 패키지별 `vitest.config.ts` (extension/mcp-server: node, webview: jsdom)
  - 샘플 테스트 파일 3개 생성
  - vitest를 루트 devDependencies로 통합, 패키지별 vitest 제거
  - webview에 jsdom devDependency 추가
- 검증: `pnpm install` 성공, `tsc --noEmit` 통과, `eslint` 클린, `vitest run` 3/3 패스
### 다음 할 일
- 훅(Hook) 설정 (ESLint + Prettier, Vitest 의존 해결됨)
- extension/mcp-server/webview 각 패키지 상세 스캐폴딩
### 이슈/참고
- vitest v3에서 `vitest.workspace.ts` deprecated → `vitest.config.ts`의 `test.projects`로 대체
- eslint-plugin-react-hooks v5 사용 (v7은 React 19+ 필요)

## 2026-03-08 — backend-dev
### 완료한 작업
- 모노레포 구조 생성 (pnpm workspace)
  - 루트: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
  - `packages/extension/`: package.json, tsconfig.json, `src/extension.ts` (activate/deactivate 스텁)
  - `packages/mcp-server/`: package.json, tsconfig.json, `src/index.ts` (빈 진입점)
  - `packages/webview/`: package.json, tsconfig.json, `src/main.tsx` (React 렌더 스텁)
  - `.gitignore`에 `dist/`, `*.vsix`, `.agent-board/` 추가
- 검증 완료: `pnpm install` 성공, 3개 패키지 모두 `tsc --noEmit` 통과
### 다음 할 일
- extension/mcp-server/webview 각 패키지 상세 스캐폴딩 (Phase 0 나머지 태스크)
- 공유 타입 정의, ESLint+Prettier, Vitest 설정
### 이슈/참고
- pnpm이 글로벌 설치되어 있지 않아 `npx pnpm`으로 실행
- `pnpm.onlyBuiltDependencies`로 better-sqlite3, esbuild 빌드 스크립트 승인 설정
