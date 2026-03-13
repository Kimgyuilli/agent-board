import * as fs from "fs/promises";
import * as path from "path";
import type { SetupProjectConfig } from "@agent-board/shared";
import { SETUP_FILES } from "@agent-board/shared";

interface CheckResult {
  exists: boolean;
  existingFiles: string[];
}

interface ScaffoldResult {
  success: boolean;
  filesCreated: string[];
  filesSkipped: string[];
  error?: string;
}

export class SetupService {
  constructor(private readonly workspaceRoot: string) {}

  async checkExisting(): Promise<CheckResult> {
    const existingFiles: string[] = [];
    const targets = SETUP_FILES.team; // team is superset of solo
    for (const rel of targets) {
      try {
        await fs.access(path.join(this.workspaceRoot, rel));
        existingFiles.push(rel);
      } catch {
        // file does not exist
      }
    }
    return { exists: existingFiles.length > 0, existingFiles };
  }

  async scaffold(config: SetupProjectConfig): Promise<ScaffoldResult> {
    try {
      const files = this._getTemplateFiles(config);
      const filesCreated: string[] = [];
      const filesSkipped: string[] = [];

      // Create directories
      const dirs = [".claude"];
      if (config.template === "team") {
        dirs.push(".claude/agents", ".claude/skills/review", ".claude/skills/test");
      }
      for (const dir of dirs) {
        await fs.mkdir(path.join(this.workspaceRoot, dir), { recursive: true });
      }

      // Write files
      for (const [rel, content] of files) {
        const fullPath = path.join(this.workspaceRoot, rel);
        if (!config.overwriteExisting) {
          try {
            await fs.access(fullPath);
            filesSkipped.push(rel);
            continue;
          } catch {
            // file does not exist, proceed to write
          }
        }
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, "utf-8");
        filesCreated.push(rel);
      }

      // Write .mcp.json (merge if exists)
      if (config.extensionPath) {
        const mcpResult = await this._writeMcpConfig(config.extensionPath, config.overwriteExisting);
        if (mcpResult.created) {
          filesCreated.push(".mcp.json");
        }
        if (mcpResult.skipped) {
          filesSkipped.push(".mcp.json");
        }
      }

      return { success: true, filesCreated, filesSkipped };
    } catch (err) {
      return {
        success: false,
        filesCreated: [],
        filesSkipped: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private _getTemplateFiles(config: SetupProjectConfig): [string, string][] {
    const files: [string, string][] = [];

    files.push(["CLAUDE.md", this._claudeMd(config)]);
    files.push([".claude/settings.json", '{\n  "permissions": {}\n}\n']);

    if (config.template === "team") {
      files.push([".claude/agents/backend-dev.md", AGENT_BACKEND]);
      files.push([".claude/agents/frontend-dev.md", AGENT_FRONTEND]);
      files.push([".claude/agents/reviewer.md", AGENT_REVIEWER]);
      files.push([".claude/skills/review/SKILL.md", SKILL_REVIEW]);
      files.push([".claude/skills/test/SKILL.md", SKILL_TEST]);
    }

    return files;
  }

  private _claudeMd(config: SetupProjectConfig): string {
    let md = `# ${config.projectName}\n\n${config.projectDescription}\n\n## Tech Stack\n\n${config.techStack || "Not specified"}\n\n## Development Conventions\n\n- Commit messages: Conventional Commits format (feat:, fix:, docs:, etc.)\n- TypeScript strict mode\n- ESLint + Prettier\n`;

    if (config.template === "team") {
      md += TEAM_SECTION;
    }

    return md;
  }

  private async _writeMcpConfig(
    extensionPath: string,
    overwriteExisting: boolean
  ): Promise<{ created: boolean; skipped: boolean }> {
    const mcpPath = path.join(this.workspaceRoot, ".mcp.json");
    const serverJsPath = path.join(extensionPath, "dist", "mcp-server.js").replace(/\\/g, "/");

    const agentBoardEntry = {
      command: "node",
      args: [serverJsPath],
      env: { AGENT_BOARD_DB: ".agent-board/board.db" },
    };

    let existing: Record<string, unknown> | null = null;
    try {
      const raw = await fs.readFile(mcpPath, "utf-8");
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // file does not exist or parse failed → create new
    }

    if (existing) {
      // existing file found
      const mcpServers = existing.mcpServers as Record<string, unknown> | undefined;
      if (!overwriteExisting && mcpServers?.["agent-board"]) {
        return { created: false, skipped: true };
      }
      // merge: add/update agent-board entry only
      if (!existing.mcpServers) {
        existing.mcpServers = {};
      }
      (existing.mcpServers as Record<string, unknown>)["agent-board"] = agentBoardEntry;
      await fs.writeFile(mcpPath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
      return { created: true, skipped: false };
    } else {
      // create new file
      const config = { mcpServers: { "agent-board": agentBoardEntry } };
      await fs.writeFile(mcpPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
      return { created: true, skipped: false };
    }
  }
}

const TEAM_SECTION = `
## Orchestrator Workflow

> The main session acts as an orchestrator. It does not write code directly — it focuses on planning, task management, and delegation.

### Core Principles

1. Start a new session → run /sync first (check current status via MCP)
2. Planning complete = MCP tasks registered (don't just plan without registering tasks)
3. Delegate coding to sub-agents (backend-dev, frontend-dev)
4. Sub-agent complete → orchestrator calls /done (sub-agents don't call MCP directly)

### Sub-Agents

| Agent | Role |
|-------|------|
| backend-dev | Backend implementation |
| frontend-dev | Frontend UI implementation |
| reviewer | Code review (read-only) |
`;

const AGENT_BACKEND = `# Backend Developer Agent

You are a backend development agent. You implement server-side logic, APIs, database operations, and backend services.

## Responsibilities
- Implement backend services and APIs
- Write database queries and migrations
- Handle server-side business logic
- Write unit tests for backend code

## Guidelines
- Follow existing code patterns and conventions
- Write clean, testable code
- Never call MCP tools directly — report results to the orchestrator
`;

const AGENT_FRONTEND = `# Frontend Developer Agent

You are a frontend development agent. You implement UI components, styling, and client-side logic.

## Responsibilities
- Implement UI components
- Handle styling and responsive design
- Manage client-side state
- Write unit tests for frontend code

## Guidelines
- Follow existing code patterns and conventions
- Use the project's design system and component library
- Never call MCP tools directly — report results to the orchestrator
`;

const AGENT_REVIEWER = `# Code Reviewer Agent

You are a code review agent. You review code for bugs, security vulnerabilities, convention violations, and performance issues.

## Responsibilities
- Review code changes for correctness
- Check for security vulnerabilities (OWASP top 10)
- Verify adherence to project conventions
- Suggest performance improvements

## Guidelines
- Be specific and actionable in feedback
- Reference file paths and line numbers
- This is a read-only role — do not modify code
`;

const SKILL_REVIEW = `# Code Review Skill

Review the specified code for:
1. Bugs and logical errors
2. Security vulnerabilities
3. Convention violations
4. Performance issues

Report findings with file paths, line numbers, and severity levels.
`;

const SKILL_TEST = `# Test Runner Skill

Run the project's test suite and report results:
1. Execute tests using the project's test framework
2. Summarize passed/failed/skipped counts
3. Report details for any failures
`;
