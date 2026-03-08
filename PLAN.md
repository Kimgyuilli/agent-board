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
