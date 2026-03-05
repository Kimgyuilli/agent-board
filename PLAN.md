# Agent Board — 작업 계획

> AI 에이전트의 태스크 관리를 위한 개발 워크플로우 도구.
> PLAN.md/PROGRESS.md 텍스트 기반 → 구조화된 API + 웹 대시보드로 전환.

## Phase 1: Backend — 모델 + CRUD API

> 핵심 데이터 모델과 REST API. 이것만으로 스킬에서 호출 가능.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| 프로젝트 초기화 (FastAPI + SQLite + uv) | backend-dev | pending | — | pyproject.toml, config, database |
| 데이터 모델 정의 | backend-dev | pending | 초기화 | Project, Phase, Task, ProgressLog |
| Task CRUD 서비스 | backend-dev | pending | 모델 | create, read, update, delete, reorder |
| Project/Phase CRUD 서비스 | backend-dev | pending | 모델 | 프로젝트 + 페이즈 관리 |
| ProgressLog 서비스 | backend-dev | pending | 모델 | 진행 기록 추가/조회 |
| 에이전트 워크플로우 서비스 | backend-dev | pending | Task+Log 서비스 | sync, next_task, claim, complete, block |
| REST API 라우터 | backend-dev | pending | 서비스 전체 | /api/projects, /api/tasks, /api/logs, /api/agent |

## Phase 2: Frontend — 대시보드 UI

> 웹에서 태스크 현황을 시각적으로 확인하고 관리.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| Next.js 프로젝트 초기화 | frontend-dev | pending | — | App Router + shadcn/ui + Tailwind |
| 프로젝트 목록/선택 페이지 | frontend-dev | pending | Phase 1 API | 프로젝트 CRUD |
| Phase 칸반 보드 | frontend-dev | pending | 프로젝트 페이지 | Phase별 컬럼, Task 카드, 상태별 색상 |
| Task 상세 패널 | frontend-dev | pending | 칸반 보드 | 설명, 의존관계, 진행 로그 타임라인 |
| 진행 대시보드 | frontend-dev | pending | 칸반 보드 | Phase별 진행률, 에이전트별 작업 현황 |
| 실시간 업데이트 | frontend-dev | pending | 대시보드 | polling 또는 SSE로 에이전트 작업 실시간 반영 |

## Phase 3: MCP Server

> Claude Code에서 네이티브 도구로 사용 가능하게.

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| MCP Server 구현 (stdio) | backend-dev | pending | Phase 1 API | REST API를 MCP 도구로 래핑 |
| .claude/settings 등록 가이드 | — | pending | MCP Server | 프로젝트별 설정 방법 문서화 |
| 기존 스킬 마이그레이션 | — | pending | MCP Server | /sync, /next, /done → MCP 도구 호출로 전환 |

## Phase 4: 고도화

| 태스크 | 담당 | 상태 | 의존 | 비고 |
|--------|------|------|------|------|
| PLAN.md/PROGRESS.md export 기능 | backend-dev | pending | Phase 1 | 기존 포맷으로 백업/내보내기 |
| PLAN.md import 기능 | backend-dev | pending | Phase 1 | 기존 프로젝트 마이그레이션 |
| 에이전트 작업 시간 추적 | backend-dev | pending | Phase 1 | claim → complete 소요 시간 자동 계산 |
| 태스크 템플릿 | backend-dev | pending | Phase 1 | 반복 패턴 (backend+frontend+review) 템플릿화 |
