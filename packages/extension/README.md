# Agent Board

AI 에이전트의 개발 태스크를 관리하고 활동을 실시간 모니터링하는 VS Code 확장입니다.

## 기능

- **칸반 보드**: Phase별 태스크를 시각적으로 관리
- **드래그 앤 드롭**: 태스크를 Phase 간 이동
- **실시간 모니터링**: DB 변경 감지를 통한 자동 UI 갱신
- **에이전트 활동 추적**: Progress Log 타임라인으로 에이전트 작업 내역 확인
- **알림**: 태스크 완료/차단 시 VS Code 알림

## 요구사항

- VS Code 1.85.0 이상
- Node.js 18 이상

## MCP Server

이 확장은 MCP(Model Context Protocol) 서버와 함께 동작합니다. MCP 서버는 AI 에이전트가 태스크를 관리할 수 있는 도구를 제공합니다.

사용 가능한 MCP 도구:
- `sync` — 프로젝트 현황 요약
- `next` — 다음 수행 가능 태스크 조회
- `claim` — 태스크 시작
- `complete` — 태스크 완료
- `block` — 태스크 차단 기록
- `context` — 태스크 상세 컨텍스트
- `add_task` — 태스크 추가
- `list_tasks` — 태스크 목록 조회

## 설정

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `agentBoard.notifications.taskCompleted` | `true` | 태스크 완료 시 알림 표시 |
| `agentBoard.notifications.taskBlocked` | `true` | 태스크 차단 시 알림 표시 |

## 명령어

| 명령어 | 설명 |
|--------|------|
| `Agent Board: Show Board` | 칸반 보드 패널 열기 |
