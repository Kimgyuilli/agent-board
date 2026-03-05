# Agent Board

AI 에이전트의 개발 태스크를 관리하는 워크플로우 도구.
PLAN.md/PROGRESS.md 텍스트 기반 관리를 구조화된 API + 웹 대시보드로 대체한다.

## 에이전트 워크플로우

> 새 세션을 시작하면 반드시 `PLAN.md`와 `PROGRESS.md`를 먼저 읽고 현재 상황을 파악한 뒤 작업을 시작한다.

### PLAN.md / PROGRESS.md

G-Tool 프로젝트와 동일한 형식. [G-Tool CLAUDE.md](../g-tool/CLAUDE.md) 참고.

## 프로젝트 목표

1. Project > Phase > Task > ProgressLog 구조로 에이전트 태스크를 DB에서 관리
2. REST API로 CRUD + 에이전트 워크플로우 (sync, next, claim, complete, block) 제공
3. 웹 대시보드에서 진행 현황을 시각적으로 확인
4. MCP Server로 Claude Code에서 네이티브 도구로 사용 가능

## 기술 스택

- **Backend**: Python (FastAPI), uv
- **Frontend**: Next.js (App Router), shadcn/ui, Tailwind CSS
- **Database**: SQLite (aiosqlite + SQLAlchemy async)
- **MCP**: Python MCP SDK (Phase 3)

## 프로젝트 구조

```
agent-board/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 엔트리포인트
│   │   ├── config.py        # 환경 설정
│   │   ├── database.py      # SQLAlchemy async engine, session
│   │   ├── models.py        # Project, Phase, Task, ProgressLog
│   │   ├── schemas.py       # Pydantic 요청/응답 모델
│   │   ├── service.py       # 비즈니스 로직
│   │   └── router.py        # API 라우터
│   ├── pyproject.toml
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/             # App Router 페이지
│   │   ├── components/      # UI 컴포넌트
│   │   ├── hooks/           # 커스텀 훅
│   │   ├── lib/             # API 클라이언트
│   │   └── types/           # TypeScript 타입
│   └── package.json
├── mcp/                     # MCP Server (Phase 3)
│   └── server.py
├── CLAUDE.md
├── PLAN.md
└── PROGRESS.md
```

## 데이터 모델

```
Project (id, name, description, created_at)
  └── Phase (id, project_id, title, order, created_at)
       └── Task (id, phase_id, title, description, status, assigned_agent,
                 blocked_reason, depends_on, position, created_at, updated_at)
            └── ProgressLog (id, task_id, agent_id, type, content,
                             files_changed, created_at)
```

### Task.status
- `pending` — 아직 시작 안 됨
- `in_progress` — 에이전트가 작업 중
- `done` — 완료
- `blocked` — 블로커 있음

### ProgressLog.type
- `started` — 태스크 시작
- `completed` — 태스크 완료
- `blocked` — 블로커 발생
- `note` — 일반 메모/진행 사항

## API 엔드포인트

### 리소스 CRUD
- `GET/POST /api/projects` — 프로젝트 목록/생성
- `GET/PUT/DELETE /api/projects/{id}` — 프로젝트 상세/수정/삭제
- `GET/POST /api/projects/{id}/phases` — 페이즈 목록/생성
- `GET/PUT/DELETE /api/phases/{id}` — 페이즈 상세/수정/삭제
- `GET/POST /api/phases/{id}/tasks` — 태스크 목록/생성
- `GET/PUT/DELETE /api/tasks/{id}` — 태스크 상세/수정/삭제
- `GET/POST /api/tasks/{id}/logs` — 진행 로그 목록/추가

### 에이전트 워크플로우
- `GET /api/agent/sync?project_id=` — 프로젝트 현재 상태 요약
- `GET /api/agent/next?project_id=` — 다음 수행 가능한 태스크
- `POST /api/agent/claim` — 태스크 할당 (→ in_progress)
- `POST /api/agent/complete` — 태스크 완료 (→ done + 로그)
- `POST /api/agent/block` — 블로커 기록 (→ blocked + 로그)
- `GET /api/agent/context?task_id=` — 태스크 컨텍스트 (의존 태스크 로그 포함)

## 개발 컨벤션

- 커밋 메시지: 한글 허용, Conventional Commits (`feat:`, `fix:`, `docs:` 등)
- Backend: Python 3.12+, 타입 힌트 필수, ruff 린트
- Frontend: TypeScript strict mode, ESLint + Prettier
- API 응답: JSON, snake_case 키

## 명령어

```bash
# Backend
cd backend && uv run fastapi dev app/main.py

# Frontend
cd frontend && pnpm dev

# Lint
cd backend && uv run ruff check .
cd frontend && pnpm lint
```
