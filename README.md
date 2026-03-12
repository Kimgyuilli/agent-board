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

## Quick Start

1. Install the extension from the VS Code Marketplace (or build from source)
2. Open the board: `Ctrl+Shift+P` → **Agent Board: Show Board**
3. Connect an MCP-compatible AI agent (see [MCP Setup](#mcp-setup))
4. Start managing tasks!

## MCP Setup

Copy the example config and adjust paths if needed:

```bash
cp .mcp.json.example .mcp.json
```

The default config works out of the box for development:

```json
{
  "mcpServers": {
    "agent-board": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "env": {
        "AGENT_BOARD_DB": ".agent-board/board.db"
      }
    }
  }
}
```

> **Note**: Make sure to build the MCP server first (`pnpm build`).

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
