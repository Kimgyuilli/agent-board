---
title: Agent Board 기능 정의서
tags: [feature-spec, architecture, planning]
created: 2026-03-08
updated: 2026-03-08
status: draft
---

# Agent Board — 기능 정의서

## 프로젝트 개요

AI 에이전트의 개발 태스크를 관리하고 활동을 실시간 모니터링하는 VS Code 확장.
텍스트 파일(PLAN.md/PROGRESS.md) 기반 관리를 구조화된 DB + 시각적 대시보드로 대체한다.

### 핵심 가치
- **에이전트 효율성**: MCP 도구로 토큰 절감 (~80%), 파일 파싱 불필요
- **사용 편의성**: 설치 한 번으로 끝, 별도 서버 실행 불필요
- **시각적 재미**: 에이전트의 작업을 게임처럼 관찰

### 사용자
- Claude Code를 사용하는 개발자
- AI 에이전트에게 개발 태스크를 위임하는 사람

---

## 기능 분류

### Must-Have (핵심)

#### F1. 태스크 관리 엔진

프로젝트의 태스크를 구조화하여 관리한다.

- **데이터 구조**: Project > Phase > Task > ProgressLog 4계층
- **태스크 상태 전이**:
  - `pending` → `in_progress` (claim)
  - `in_progress` → `done` (complete)
  - `in_progress` → `blocked` (block)
  - `blocked` → `pending` (unblock)
- **의존 관계**: Task가 다른 Task에 의존 가능. 의존 태스크가 모두 done이어야 수행 가능
- **위치 정렬**: Phase 내에서 Task의 순서(position) 관리, 드래그로 재배치
- **진행 로그**: 태스크마다 시작/완료/블로커/메모 기록 자동 축적
- **프로젝트별 독립 DB**: 워크스페이스마다 별도 DB 파일 (`.agent-board/board.db`)

#### F2. MCP 도구 (Claude Code 연동)

Claude Code에서 네이티브 도구로 태스크를 관리한다. 별도 프로세스(stdio)로 실행.

| 도구 | 설명 |
|------|------|
| `sync` | 프로젝트 현재 상태 요약 (Phase별 통계, 진행 중/블로커 태스크, 최근 로그) |
| `next` | 수행 가능한 다음 태스크 추천 (의존 해결 + 우선순위 기반) |
| `claim` | 태스크를 에이전트에 할당하고 in_progress로 변경. 의존 태스크의 완료 로그도 함께 반환 |
| `complete` | 태스크를 done으로 변경 + 완료 로그 기록. 새로 unblock된 태스크와 Phase 진행률 반환 |
| `block` | 태스크를 blocked로 변경 + 블로커 사유 기록 |
| `context` | 태스크 상세 정보 + 전체 로그 + 의존 관계 조회 |
| `add_task` | 새 태스크 생성 (Phase 지정, 의존 관계 설정 가능) |
| `list_tasks` | 필터 기반 태스크 목록 조회 (상태, Phase, 에이전트별) |

**MCP 도구 설계 원칙:**
- 응답은 에이전트가 다음 행동을 결정하는 데 필요한 **최소 정보만** 포함
- `claim` 시 context를 함께 반환하여 별도 호출 절감
- `complete` 시 새로 unblock된 태스크를 반환하여 연쇄 작업 유도

#### F3. 태스크 보드 UI (Webview)

VS Code 패널에서 태스크 현황을 시각적으로 확인하고 관리한다.

- **칸반 보드**: Phase별 컬럼, Task 카드를 상태별 색상으로 구분
  - pending: 회색, in_progress: 파랑, done: 초록, blocked: 빨강
- **카드 드래그 이동**: Phase 간/Phase 내 Task 위치 변경
- **Task 상세 패널**: 클릭 시 설명, 의존관계, 할당 에이전트, ProgressLog 타임라인 표시
- **리스트 뷰**: 테이블 형태로 전체 태스크 조회, 필터/정렬 지원
- **Phase 진행률 바**: 각 Phase의 done/total 비율 시각화
- **자동 새로고침**: MCP Server가 DB를 변경하면 UI에 즉시 반영

#### F4. 에이전트 활동 모니터링

Claude Code 에이전트의 실시간 활동을 추적하여 표시한다.

- **JSONL 트랜스크립트 감시**: `~/.claude/projects/` 하위 세션 파일을 실시간 감시
- **에이전트 상태 추적**:
  - `active` — 도구를 실행 중 (파일 읽기/쓰기, 명령 실행 등)
  - `idle` — 아직 활동 시작 전
  - `waiting` — 턴 종료, 사용자 입력 대기 중
  - `permission` — 도구 실행 권한 대기 중 (일정 시간 응답 없을 때)
- **현재 활동 표시**: "Reading main.ts", "Running: npm test" 등 도구별 상태 메시지
- **서브에이전트 추적**: Task 도구로 생성된 하위 에이전트도 별도로 추적
- **VS Code 터미널 연결**: 각 에이전트를 해당 터미널과 매핑

---

### Nice-to-Have (추가)

#### F5. 알림 시스템

- 에이전트가 permission 대기 중일 때 VS Code 알림 (토스트)
- 태스크 완료/블로커 발생 시 알림
- 사운드 알림 옵션 (on/off 설정)

#### F6. PLAN.md 임포트

- 기존 PLAN.md 마크다운 테이블을 파싱하여 DB로 마이그레이션
- Project/Phase/Task 구조 자동 변환
- 의존관계, 상태, 비고 컬럼 매핑

#### F7. PLAN.md/PROGRESS.md 익스포트

- DB 데이터를 기존 마크다운 형식으로 내보내기
- 기존 텍스트 기반 워크플로우와의 호환성 유지

#### F8. 태스크 의존 관계 그래프

- DAG 형태로 태스크 간 의존 관계를 시각적으로 표시
- 크리티컬 패스 강조 (가장 긴 의존 체인)
- 완료/진행 중/대기 상태별 노드 색상 구분

#### F9. 에이전트 작업 시간 추적

- claim → complete 소요 시간 자동 계산 및 기록
- 에이전트별, Phase별 작업 시간 통계
- 평균 태스크 처리 시간 표시

---

### Future (향후 확장)

#### F10. 픽셀 아트 에이전트 시각화

- 에이전트별 픽셀 아트 캐릭터 할당
- 상태에 따른 캐릭터 애니메이션 (코딩/대기/블로커)
- 현재 작업 중인 태스크 정보가 캐릭터 위에 표시
- 가상 사무실 환경에서 캐릭터가 활동
- 캐릭터 에셋: 별도 결정 (pixel-agents MIT 에셋 활용 또는 자체 제작)

#### F11. 태스크 템플릿

- 반복 패턴 (예: backend 구현 + frontend 구현 + 리뷰) 템플릿화
- MCP 도구로 템플릿 기반 태스크 일괄 생성

#### F12. 멀티 에이전트 협업 뷰

- 여러 에이전트가 동시에 작업할 때 파일 수준 충돌 감지
- 에이전트 간 태스크 의존 관계 시각화

#### F13. 멀티 프로젝트 대시보드

- 여러 프로젝트를 동시에 관리
- 프로젝트 간 빠른 전환

---

## 데이터 모델

```
Project
  - id, name, description, created_at

Phase
  - id, project_id (FK), title, order, created_at

Task
  - id, phase_id (FK), title, description
  - status: pending | in_progress | done | blocked
  - assigned_agent, blocked_reason
  - depends_on (태스크 ID 배열)
  - position (Phase 내 순서)
  - created_at, updated_at

ProgressLog
  - id, task_id (FK), agent_id
  - type: started | completed | blocked | note
  - content, files_changed
  - created_at
```

---

## 사용 시나리오

### 시나리오 1: 에이전트가 태스크를 수행하는 흐름

```
1. 에이전트 세션 시작
2. MCP sync 호출 → 프로젝트 상태 파악 (토큰 ~300)
3. MCP next 호출 → 다음 태스크 추천 받음 (토큰 ~200)
4. MCP claim 호출 → 태스크 할당 + 컨텍스트 수신 (토큰 ~300)
5. (실제 개발 작업 수행)
6. MCP complete 호출 → 완료 기록 + 다음 가능 태스크 확인 (토큰 ~200)
                                               총 워크플로우 토큰: ~1,000
```

※ 기존 텍스트 파일 방식: ~4,000-5,500 토큰/사이클

### 시나리오 2: 개발자가 대시보드에서 현황 확인

```
1. VS Code 패널에서 Agent Board 열기
2. 칸반 보드에서 Phase별 태스크 현황 확인
3. 에이전트 모니터에서 현재 에이전트가 "Writing router.ts" 중인 것 확인
4. 블로커가 있는 태스크 클릭 → 상세 패널에서 사유 확인
5. 드래그로 태스크 우선순위 조정
```

### 시나리오 3: 에이전트 활동 모니터링

```
1. Claude Code 터미널에서 에이전트 실행
2. Agent Board 패널에 새 에이전트 캐릭터 등장
3. 에이전트가 파일을 읽으면 "Reading schema.ts" 표시
4. 서브에이전트 생성 시 새 캐릭터 추가
5. 에이전트가 permission 대기 시 알림 표시
6. 턴 종료 시 "Waiting for input" 상태로 전환
```
