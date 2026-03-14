# Agent Board

AI 에이전트의 개발 태스크를 관리하고 활동을 실시간 모니터링하는 VS Code 확장.

Claude Code 등 MCP 호환 AI 에이전트가 칸반 보드를 통해 태스크를 자율적으로 관리할 수 있도록 설계했습니다.

<!-- ![Agent Board Screenshot](docs/screenshot.png) -->

## 주요 기능

- **칸반 보드** — Phase별 태스크를 드래그 앤 드롭으로 관리
- **실시간 모니터링** — DB 변경 감지로 자동 UI 갱신
- **에이전트 활동 추적** — Progress Log 타임라인으로 에이전트 작업 이력 확인
- **알림** — 태스크 완료/블로커 발생 시 VS Code 알림
- **MCP 통합** — Model Context Protocol 도구로 AI 에이전트가 직접 태스크 관리
- **프로젝트 셋업 위저드** — `.claude/` 설정 파일과 `CLAUDE.md`를 템플릿으로 자동 생성

## 빠른 시작

1. VS Code Marketplace에서 확장을 설치 (또는 소스에서 빌드)
2. `Ctrl+Shift+P` → **Agent Board: Show Board**
3. Setup Wizard로 프로젝트 설정 스캐폴딩
4. MCP 호환 AI 에이전트 연결
5. 태스크 관리 시작!

## 셋업 위저드

Command Palette (`Ctrl+Shift+P` → `Agent Board: Setup Project`) 또는 빈 보드의 **Setup Project** 버튼으로 실행.

3단계로 구성:

1. **프로젝트 정보** — 프로젝트명, 설명, 기술 스택 입력
2. **템플릿 선택** — Solo (개인) 또는 Team (멀티 에이전트 오케스트레이터)
3. **미리보기 및 생성** — 파일 목록 확인 후 워크스페이스 루트에 생성

### 생성 파일 (Team 템플릿)

```
CLAUDE.md                        # 프로젝트 설명 + 컨벤션 + 오케스트레이터 워크플로우
.claude/settings.json            # Claude Code 설정
.claude/agents/backend-dev.md    # 백엔드 구현 에이전트
.claude/agents/frontend-dev.md   # 프론트엔드 UI 에이전트
.claude/agents/reviewer.md       # 코드 리뷰 에이전트
.claude/skills/review/SKILL.md   # 코드 리뷰 스킬
.claude/skills/test/SKILL.md     # 테스트 러너 스킬
.mcp.json                        # MCP 서버 설정 (확장 경로 자동 설정)
```

## MCP 설정

**셋업 위저드**가 `.mcp.json`을 자동 생성합니다. 수동 설정이 필요한 경우:

```json
{
  "mcpServers": {
    "agent-board": {
      "command": "node",
      "args": ["<path-to-extension>/dist/mcp-server.js"],
      "env": {
        "AGENT_BOARD_DB": ".agent-board/board.db"
      }
    }
  }
}
```

> `<path-to-extension>`을 VS Code 확장 설치 경로로 교체하세요 (예: `~/.vscode/extensions/agent-board-0.0.1`).

## MCP 도구

| 도구 | 설명 |
|------|------|
| `sync` | 프로젝트 요약 (Phase별 통계, 활성 태스크, 최근 로그) |
| `next` | 수행 가능한 태스크 목록 (pending + 의존 해결됨) |
| `claim` | 태스크 할당 (status → in_progress) |
| `complete` | 태스크 완료 (status → done) |
| `block` | 블로커 등록 (사유 기록) |
| `context` | 태스크 상세 (태스크 + Phase + 로그 + 의존관계) |
| `add_phase` | 새 Phase 추가 |
| `add_task` | 새 태스크 추가 (의존관계 포함) |
| `list_tasks` | 태스크 목록 조회 (필터: status, phase, agent) |
| `archive_phase` | Phase 아카이브/해제 |
| `batch` | 여러 작업을 단일 트랜잭션으로 일괄 실행 |

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                   VS Code                        │
│  ┌───────────┐    ┌──────────────────────────┐  │
│  │ Extension  │◄──►│   Webview (React)        │  │
│  │  Host      │    │   Kanban Board UI        │  │
│  └─────┬──────┘    └──────────────────────────┘  │
│        │ stdio                                    │
│  ┌─────▼──────┐                                  │
│  │Board Server │◄── SQLite DB (.agent-board/)    │
│  └─────┬──────┘                                  │
│        │                                          │
└────────┼──────────────────────────────────────────┘
         │ stdio
   ┌─────▼──────┐
   │ MCP Server  │◄── AI Agents (Claude, etc.)
   └─────────────┘
```

## 기술 스택

- **언어**: TypeScript 5.x (strict mode)
- **패키지 관리**: pnpm workspace 모노레포
- **Extension**: VS Code Extension API, esbuild, chokidar
- **MCP Server**: @modelcontextprotocol/sdk, better-sqlite3
- **Webview**: React, Vite, Tailwind CSS, @dnd-kit
- **테스트**: Vitest, @vscode/test-electron

## 프로젝트 구조

```
agent-board/
├── packages/
│   ├── shared/        # 공유 TypeScript 타입
│   ├── extension/     # VS Code 확장 호스트
│   ├── mcp-server/    # MCP 도구 + SQLite DB
│   └── webview/       # React 칸반 보드 UI
├── package.json
└── pnpm-workspace.yaml
```

## 개발

```bash
pnpm install          # 의존성 설치
pnpm build            # 전체 빌드
pnpm test             # 테스트
pnpm lint             # 린트
```

## 라이선스

[MIT](LICENSE)
