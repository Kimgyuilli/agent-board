# 작업 계획

## Phase 0: 프로젝트 초기 설정

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 모노레포 구조 생성 (pnpm workspace) | backend-dev | done | — | pnpm-workspace.yaml, tsconfig.base.json |
| extension 패키지 스캐폴딩 | backend-dev | done | 모노레포 구조 생성 | package.json, esbuild, activate() |
| mcp-server 패키지 스캐폴딩 | backend-dev | done | 모노레포 구조 생성 | MCP SDK, better-sqlite3, zod, DB schema |
| webview 패키지 스캐폴딩 | frontend-dev | done | 모노레포 구조 생성 | Vite, React, Tailwind, dnd-kit |
| 공유 타입 정의 | backend-dev | done | 모노레포 구조 생성 | packages/shared (models, messages, mcp) |
| ESLint + Prettier 설정 | backend-dev | done | 모노레포 구조 생성 | flat config, React 플러그인 포함 |
| Vitest 설정 | backend-dev | done | 모노레포 구조 생성 | workspace projects 모드, jsdom(webview) |
| 훅(Hook) 설정 | backend-dev | done | ESLint + Prettier, Vitest | TeammateIdle + TaskCompleted 훅 |

## Phase 1: DB 서비스 레이어 + MCP 도구 구현

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| DB 서비스 레이어 구현 | backend-dev | done | Phase 0 완료 | service.ts: 9개 서비스 함수 |
| MCP 도구 핸들러 연결 | backend-dev | done | DB 서비스 레이어 | index.ts: stub → 실제 구현 |
| 서비스 레이어 단위 테스트 | backend-dev | done | DB 서비스 레이어 | 29개 테스트 케이스 |
| PLAN.md / PROGRESS.md 업데이트 | backend-dev | done | 서비스 레이어 단위 테스트 | — |

## Phase 2: Extension ↔ DB 연결 + Webview 빌드 파이프라인

> Extension이 DB 서비스 레이어를 직접 import하여 사용. MCP Server와 같은 SQLite 파일을 WAL 모드로 공유.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| Extension에서 DB 서비스 레이어 import + 초기화 | backend-dev | done | Phase 1 | activate()에서 DB 연결, deactivate()에서 정리 |
| Extension 메시지 핸들러 구현 | backend-dev | done | DB 서비스 import | BoardPanel.ts 4개 메시지 핸들러 구현 |
| Webview 빌드 → Extension 로드 파이프라인 | backend-dev | done | — | BoardPanel에서 dist/assets/index.js 로드 |
| Extension 빌드에 webview 번들 포함 | backend-dev | done | Webview 빌드 파이프라인 | prebuild 복사 + esbuild external |

## Phase 3: Webview 칸반 보드 UI

> Phase 컬럼 + Task 카드를 렌더링하는 칸반 보드 UI 구현.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 칸반 보드 레이아웃 (Phase 컬럼) | frontend-dev | done | Phase 2 | KanbanBoard + PhaseColumn 컴포넌트 |
| Task 카드 컴포넌트 | frontend-dev | done | 칸반 보드 레이아웃 | TaskCard + StatusBadge 컴포넌트 |
| 데이터 바인딩 (useVSCodeApi → React state) | frontend-dev | done | 칸반 보드 레이아웃 | useBoardData 훅 |
| 빈 상태 / 로딩 UI | frontend-dev | done | 데이터 바인딩 | EmptyState + loading spinner |

## Phase 3.5: Extension↔MCP Server 프로세스 분리

> Extension이 better-sqlite3를 직접 import하지 않고, MCP Server를 child_process로 실행하여 통신하도록 아키텍처 변경.
> 원인: better-sqlite3 네이티브 모듈이 Electron(Extension Host)과 시스템 Node.js(테스트)에서 서로 다른 ABI를 요구하여, 매번 rebuild 전환이 필요한 문제 해결.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| IPC 프로토콜 타입 정의 (shared/ipc.ts) | backend-dev | done | Phase 3 | JSON-RPC 2.0 + BoardRpcMethods |
| Board IPC Server 구현 (board-handler.ts + board-server.ts) | backend-dev | done | IPC 타입 | stdin/stdout ndjson, RPC 디스패치 |
| ProcessManager 구현 | backend-dev | done | IPC 타입 | child_process spawn/kill/restart |
| BoardClient 구현 (BoardService 대체) | backend-dev | done | ProcessManager | IBoardService 인터페이스, JSON-RPC 클라이언트 |
| Extension 통합 (extension.ts + BoardPanel) | backend-dev | done | Board Server + BoardClient | DB 직접 import 제거 |
| 의존성 정리 + 빌드 설정 | backend-dev | done | Extension 통합 | better-sqlite3 제거, prebuild 수정 |
| 테스트 수정 + 추가 | backend-dev | done | 의존성 정리 | 55개 테스트 통과 (기존 48 → 55) |

## Phase 4: 드래그앤드롭 + 태스크 인터랙션

> 사용자가 UI에서 태스크를 조작할 수 있게 한다.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| @dnd-kit 드래그앤드롭 통합 | frontend-dev | done | Phase 3.5 | DndContext + SortableContext + DragOverlay |
| 태스크 상태 변경 UI | frontend-dev | done | Phase 3.5 | StatusDropdown 컴포넌트 |
| 태스크 상세 패널/모달 | frontend-dev | done | Phase 3.5 | TaskDetailModal + useTaskDetail 훅 |
| Extension ↔ Webview 양방향 동기화 | frontend-dev | done | Phase 3.5 | useTaskActions + 낙관적 업데이트 (백엔드는 Phase 3.5에서 완료) |

## Phase 5: 실시간 모니터링 + 에이전트 활동

> AI 에이전트의 활동을 실시간으로 모니터링한다.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| RPC 메서드 추가 (getChanges, getProgressLogs) | backend-dev | done | Phase 4 | ipc.ts, service.ts, board-handler.ts, BoardClient.ts |
| DB 변경 감지 (ChangeMonitor) | backend-dev | done | RPC 메서드 | WAL 감시 + 디바운스 + 폴백 폴링 |
| 에이전트 활동 표시 (AgentBadge) | frontend-dev | done | RPC 메서드 | 에이전트별 상태 뱃지 + useBoardData 확장 |
| Progress Log 타임라인 | frontend-dev | done | 에이전트 활동 표시 | ProgressTimeline + useProgressLogs + TaskDetailModal 통합 |
| 알림 (NotificationService) | backend-dev | done | ChangeMonitor | 태스크 완료/블록 시 VS Code 알림 + 설정 |

## Phase 6: 테스트 + 패키징

> 품질 보증 + 배포 가능한 VSIX 패키지 생성.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| Extension 단위 테스트 | backend-dev | done | Phase 4 | ProcessManager(12), ChangeMonitor(10), NotificationService(10), BoardPanel(10) |
| Webview 컴포넌트/훅 테스트 | frontend-dev | done | Phase 4 | 훅 4개(25), 컴포넌트 6개(39) — @testing-library/react |
| E2E 테스트 | backend-dev | pending | Phase 5 | @vscode/test-electron |
| VSIX 패키징 + README | backend-dev | pending | E2E 테스트 | vsce package |
