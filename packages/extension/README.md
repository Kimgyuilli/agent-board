# Agent Board

Manage AI agent development tasks with a real-time kanban board in VS Code.

## Features

- **Kanban Board** — Visualize tasks organized by phases
- **Drag & Drop** — Move tasks between phases
- **Real-time Updates** — Automatic UI refresh on data changes
- **Agent Activity Tracking** — Progress log timeline
- **Notifications** — Alerts for task completion and blockers
- **MCP Integration** — AI agents manage tasks via Model Context Protocol

## Quick Start

1. Open the board: `Ctrl+Shift+P` → **Agent Board: Show Board**
2. Or click the Agent Board icon in the Activity Bar
3. Connect an MCP-compatible AI agent to start managing tasks

## MCP Setup

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "agent-board": {
      "command": "node",
      "args": ["<path-to-extension>/dist/index.js"],
      "env": {
        "AGENT_BOARD_DB": "<path-to-workspace>/.agent-board/board.db"
      }
    }
  }
}
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `agentBoard.notifications.taskCompleted` | `true` | Show notification when a task is completed |
| `agentBoard.notifications.taskBlocked` | `true` | Show notification when a task is blocked |

## Commands

| Command | Description |
|---------|-------------|
| `Agent Board: Show Board` | Open the kanban board panel |
