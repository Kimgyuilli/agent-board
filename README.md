# Agent Board

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue.svg)](https://code.visualstudio.com/)

Manage AI agent development tasks with a real-time kanban board in VS Code.

<!-- ![Agent Board Screenshot](docs/screenshot.png) -->

## Features

- **Kanban Board** — Visualize tasks organized by phases
- **Drag & Drop** — Move tasks between phases with ease
- **Real-time Monitoring** — Automatic UI updates via DB change detection
- **Agent Activity Tracking** — Progress log timeline for agent work history
- **Notifications** — VS Code alerts for task completion and blockers
- **MCP Integration** — AI agents manage tasks via Model Context Protocol tools
- **Project Setup Wizard** — Generate `.claude/` config and `CLAUDE.md` with guided templates

## Quick Start

1. Install the extension from the VS Code Marketplace (or build from source)
2. Open the board: `Ctrl+Shift+P` → **Agent Board: Show Board**
3. Run the Setup Wizard to scaffold your project (see [Setup Wizard](#setup-wizard))
4. Connect an MCP-compatible AI agent (see [MCP Setup](#mcp-setup))
5. Start managing tasks!

## Setup Wizard

The Setup Wizard helps beginners scaffold the configuration files needed for Claude Code agents.

Run via **Command Palette** (`Ctrl+Shift+P` → `Agent Board: Setup Project`) or click the **Setup Project** button in the empty board view.

The wizard walks through 3 steps:

1. **Project Info** — Enter your project name, description, and tech stack
2. **Template Selection** — Choose between two templates:
   - **Solo** — Single developer workflow (`CLAUDE.md` + `.claude/settings.json`)
   - **Team** — Multi-agent orchestrator workflow (adds agent definitions and skill files)
3. **Preview & Generate** — Review the file list and generate to your workspace root

### Generated Files (Team template)

```
CLAUDE.md                        # Project description + conventions + orchestrator workflow
.claude/settings.json            # Claude Code settings
.claude/agents/backend-dev.md    # Backend implementation agent
.claude/agents/frontend-dev.md   # Frontend UI agent
.claude/agents/reviewer.md       # Code review agent
.claude/skills/review/SKILL.md   # Code review skill
.claude/skills/test/SKILL.md     # Test runner skill
.mcp.json                        # MCP server config (auto-generated with extension path)
```

> If files already exist, the wizard warns you and offers an overwrite option.

## MCP Setup

The **Setup Wizard** automatically generates `.mcp.json` with the correct extension path when you run it. No manual configuration needed.

If you prefer manual setup, create `.mcp.json` in your workspace root:

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

> **Note**: Replace `<path-to-extension>` with your VS Code extension install path (e.g., `~/.vscode/extensions/agent-board-0.0.1`). If existing `.mcp.json` is present, the Setup Wizard merges the `agent-board` entry without overwriting other servers.

## MCP Tool Reference

| Tool | Description |
|------|-------------|
| `sync` | Get project summary (phases, stats, active tasks, recent logs) |
| `next` | List next actionable tasks (pending + dependencies resolved) |
| `claim` | Assign a task to an agent (status → in_progress) |
| `complete` | Mark a task as done (with optional completion notes) |
| `block` | Record a blocker on a task (with reason) |
| `context` | Get full task context (task + phase + logs + dependencies) |
| `add_phase` | Create a new phase |
| `add_task` | Create a new task (with optional dependencies) |
| `list_tasks` | Query tasks (filter by status, phase, agent) |
| `archive_phase` | Archive/unarchive a phase |
| `batch` | Execute multiple operations in a single transaction |

## Architecture

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

## Project Structure

```
agent-board/
├── packages/
│   ├── shared/        # Shared TypeScript types
│   ├── extension/     # VS Code extension host
│   ├── mcp-server/    # MCP tools + SQLite DB
│   └── webview/       # React kanban board UI
├── package.json       # Workspace root
└── pnpm-workspace.yaml
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, build instructions, and contribution guidelines.

```bash
# Install dependencies
pnpm install

# Build all packages (order matters)
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## License

[MIT](LICENSE) © Agent Board Contributors
