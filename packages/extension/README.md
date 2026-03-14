# Agent Board

AI 에이전트의 개발 태스크를 관리하고 활동을 실시간 모니터링하는 VS Code 확장.

## 주요 기능

- **칸반 보드** — Phase별 태스크를 드래그 앤 드롭으로 관리
- **실시간 모니터링** — DB 변경 감지로 자동 UI 갱신
- **에이전트 활동 추적** — Progress Log 타임라인
- **알림** — 태스크 완료/블로커 발생 시 VS Code 알림
- **MCP 통합** — AI 에이전트가 Model Context Protocol로 태스크 직접 관리
- **프로젝트 셋업 위저드** — `.claude/` 설정과 `CLAUDE.md`를 템플릿으로 자동 생성

## 빠른 시작

1. `Ctrl+Shift+P` → **Agent Board: Show Board**
2. 또는 Activity Bar의 Agent Board 아이콘 클릭
3. MCP 호환 AI 에이전트를 연결하여 태스크 관리 시작

## MCP 설정

**Setup Wizard** (`Ctrl+Shift+P` → `Agent Board: Setup Project`)를 실행하면 `.mcp.json`이 자동 생성됩니다. 기존 `.mcp.json`이 있으면 병합합니다.

## 설정

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `agentBoard.notifications.taskCompleted` | `true` | 태스크 완료 시 알림 |
| `agentBoard.notifications.taskBlocked` | `true` | 태스크 블로커 발생 시 알림 |

## 명령어

| 명령어 | 설명 |
|--------|------|
| `Agent Board: Show Board` | 칸반 보드 패널 열기 |
| `Agent Board: Setup Project` | 프로젝트 셋업 위저드 실행 |
