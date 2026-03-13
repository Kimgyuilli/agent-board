# Connect MCP Server

Agent Board includes an MCP (Model Context Protocol) server that AI agents use to manage tasks.

## Automatic Setup (Recommended)

Run the **Setup Wizard** (`Ctrl+Shift+P` → `Agent Board: Setup Project`). It automatically generates `.mcp.json` in your workspace with the correct extension path.

If your workspace already has a `.mcp.json` with other MCP servers, the wizard merges the `agent-board` entry without overwriting existing configuration.

## Manual Setup

If you prefer manual configuration, add the following to `.mcp.json` in your workspace root:

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

Replace `<path-to-extension>` with your VS Code extension install path.

## Verify

Once configured, your AI agent should be able to call MCP tools like `sync`, `add_phase`, and `add_task`.
