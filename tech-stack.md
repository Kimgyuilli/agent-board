---
title: Agent Board 기술 스택
tags: [tech-stack, architecture]
created: 2026-03-08
updated: 2026-03-08
status: confirmed
---

# Agent Board — 기술 스택

## 언어 & 런타임

| 항목 | 선택 | 비고 |
|------|------|------|
| 언어 | TypeScript 5.x (strict mode) | 전체 패키지 통일 |
| 런타임 | Node.js (VS Code 내장) | 별도 설치 불필요 |
| 패키지 매니저 | pnpm | workspace 모노레포 |

---

## 모노레포 구조

```
agent-board/
├── pnpm-workspace.yaml
├── packages/
│   ├── extension/        # VS Code 확장 호스트
│   ├── mcp-server/       # MCP 도구 + DB 로직
│   └── webview/          # React 칸반 보드 UI
├── tsconfig.base.json    # 공유 TypeScript 설정
├── .eslintrc.js
└── .prettierrc
```

### 패키지 역할

| 패키지 | 역할 | 진입점 |
|--------|------|--------|
| `@agent-board/extension` | VS Code 확장 등록, Webview 호스팅, 에이전트 모니터링 | `activate()` |
| `@agent-board/mcp-server` | MCP 도구 제공, DB CRUD, Claude Code 연동 | stdio 프로세스 |
| `@agent-board/webview` | 태스크 보드 UI (칸반, 리스트 뷰, 상세 패널) | React SPA |

### 패키지 의존 방향

```
extension ──→ mcp-server (DB 스키마/타입 공유)
extension ──→ webview (빌드 산출물 임베딩)
mcp-server    (독립 실행, 외부 의존 없음)
webview       (독립 빌드, VS Code API는 postMessage로 통신)
```

---

## 레이어별 기술 선택

### 1. VS Code Extension (`packages/extension`)

| 항목 | 선택 | 이유 |
|------|------|------|
| API | VS Code Extension API | 확장 개발 표준 |
| 번들러 | esbuild | VS Code 공식 권장, 빠른 빌드 |
| 파일 감시 | chokidar | `~/.claude/projects/` JSONL 트랜스크립트 감시 |
| JSONL 파싱 | Node.js readline | 스트림 기반 라인 단위 파싱 |

### 2. MCP Server (`packages/mcp-server`)

| 항목 | 선택 | 이유 |
|------|------|------|
| SDK | @modelcontextprotocol/sdk | MCP 공식 TypeScript SDK |
| 전송 | stdio | Claude Code가 프로세스 직접 실행, 별도 서버 불필요 |
| 번들러 | esbuild | 단일 JS 파일로 번들, 빠른 시작 |

### 3. Database

| 항목 | 선택 | 이유 |
|------|------|------|
| DB | better-sqlite3 | 동기식 SQLite, 임베디드, 단일 파일 |
| DB 경로 | `.agent-board/board.db` | 워크스페이스별 독립 DB |
| 마이그레이션 | 직접 구현 (버전 테이블) | 경량 유지, ORM 불필요 |

**선택 근거:**
- 별도 DB 서버 없이 임베디드로 동작 → "설치 한 번으로 끝" 원칙
- extension과 mcp-server가 같은 DB 파일에 접근
- better-sqlite3는 동기식이라 MCP 도구의 요청-응답 패턴에 적합

### 4. Webview UI (`packages/webview`)

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | React 18 | 컴포넌트 기반, 칸반/리스트 뷰 구현에 적합 |
| 번들러 | Vite | HMR으로 빠른 개발, 최적화된 프로덕션 빌드 |
| 스타일링 | Tailwind CSS | 유틸리티 클래스 기반, 빠른 UI 개발 |
| VS Code 통합 | @vscode/webview-ui-toolkit | 네이티브 룩앤필 컴포넌트 |
| 드래그 앤 드롭 | @dnd-kit | 경량, React 친화적, 접근성 지원 |
| 상태 관리 | React Context + useReducer | 이 규모에서 외부 라이브러리 불필요 |

**Extension ↔ Webview 통신:**
- `postMessage` / `onDidReceiveMessage` 기반
- 타입 안전한 메시지 프로토콜 정의 (공유 타입)

---

## 개발 도구

### 빌드

| 항목 | 선택 |
|------|------|
| Extension 번들 | esbuild |
| MCP Server 번들 | esbuild |
| Webview 번들 | Vite (내부적으로 esbuild + Rollup) |

### 테스트

| 항목 | 선택 | 대상 |
|------|------|------|
| 단위/통합 테스트 | Vitest | DB 로직, MCP 도구, React 컴포넌트 |
| E2E 테스트 | @vscode/test-electron | VS Code 확장 통합 |

### 코드 품질

| 항목 | 선택 |
|------|------|
| 린터 | ESLint |
| 포매터 | Prettier |
| 타입 체크 | TypeScript strict mode |

---

## 주요 npm 패키지 요약

```
# Extension
@types/vscode
esbuild
chokidar

# MCP Server
@modelcontextprotocol/sdk
better-sqlite3
@types/better-sqlite3

# Webview
react, react-dom
@vitejs/plugin-react
tailwindcss
@vscode/webview-ui-toolkit
@dnd-kit/core, @dnd-kit/sortable

# 공통 (dev)
typescript
eslint, prettier
vitest
```
