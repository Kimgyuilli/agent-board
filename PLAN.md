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
| Extension에서 DB 서비스 레이어 import + 초기화 | backend-dev | pending | Phase 1 | activate()에서 DB 연결, deactivate()에서 정리 |
| Extension 메시지 핸들러 구현 | backend-dev | pending | DB 서비스 import | BoardPanel.ts TODO 4개 (request-refresh, move-task 등) |
| Webview 빌드 → Extension 로드 파이프라인 | backend-dev | pending | — | BoardPanel에서 dist/assets/index.js 로드 |
| Extension 빌드에 webview 번들 포함 | backend-dev | pending | Webview 빌드 파이프라인 | esbuild external 설정 or 복사 |

## Phase 3: Webview 칸반 보드 UI

> Phase 컬럼 + Task 카드를 렌더링하는 칸반 보드 UI 구현.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 칸반 보드 레이아웃 (Phase 컬럼) | frontend-dev | pending | Phase 2 | 가로 스크롤, Phase별 컬럼 |
| Task 카드 컴포넌트 | frontend-dev | pending | 칸반 보드 레이아웃 | 상태 뱃지, 에이전트, blocked 사유 |
| 데이터 바인딩 (useVSCodeApi → React state) | frontend-dev | pending | 칸반 보드 레이아웃 | init-data 수신 → state 업데이트 |
| 빈 상태 / 로딩 UI | frontend-dev | pending | 데이터 바인딩 | 프로젝트 없을 때, 로딩 중 표시 |

## Phase 4: 드래그앤드롭 + 태스크 인터랙션

> 사용자가 UI에서 태스크를 조작할 수 있게 한다.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| @dnd-kit 드래그앤드롭 통합 | frontend-dev | pending | Phase 3 | Phase 간 이동, 순서 변경 |
| 태스크 상태 변경 UI | frontend-dev | pending | Phase 3 | 상태 드롭다운 or 버튼 |
| 태스크 상세 패널/모달 | frontend-dev | pending | Phase 3 | 제목, 설명, 에이전트 편집 |
| Extension ↔ Webview 양방향 동기화 | backend-dev | pending | Phase 3 | 변경 → DB 저장 → UI 갱신 |

## Phase 5: 실시간 모니터링 + 에이전트 활동

> AI 에이전트의 활동을 실시간으로 모니터링한다.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| DB 변경 감지 (file watcher / polling) | backend-dev | pending | Phase 4 | MCP Server의 DB 변경을 Extension이 감지 |
| 에이전트 활동 표시 | frontend-dev | pending | DB 변경 감지 | 에이전트별 상태 뱃지, 현재 작업 표시 |
| Progress Log 타임라인 | frontend-dev | pending | DB 변경 감지 | 태스크별 활동 로그 표시 |
| 알림 (Notification) | backend-dev | pending | DB 변경 감지 | 태스크 완료/블록 시 VS Code 알림 |

## Phase 6: 테스트 + 패키징

> 품질 보증 + 배포 가능한 VSIX 패키지 생성.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| Extension 단위 테스트 | backend-dev | pending | Phase 4 | 메시지 핸들러, DB 연동 |
| Webview 컴포넌트 테스트 | frontend-dev | pending | Phase 4 | Vitest + jsdom |
| E2E 테스트 | backend-dev | pending | Phase 5 | @vscode/test-electron |
| VSIX 패키징 + README | backend-dev | pending | E2E 테스트 | vsce package |
