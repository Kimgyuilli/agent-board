# Connect MCP Server

Agent Board includes an MCP (Model Context Protocol) server that AI agents use to manage tasks.

## Setup

Add the following to your MCP client configuration (e.g., `.mcp.json`):

```json
{
  "mcpServers": {
    "agent-board": {
      "command": "node",
      "args": ["path/to/agent-board/dist/index.js"],
      "env": {
        "AGENT_BOARD_DB": "path/to/workspace/.agent-board/board.db"
      }
    }
  }
}
```

Replace the paths with actual paths to the installed extension and your project directory.

## Verify

Once configured, your AI agent should be able to call MCP tools like `sync`, `add_phase`, and `add_task`.
