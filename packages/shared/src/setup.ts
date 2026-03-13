export type SetupTemplate = "solo" | "team";

export interface SetupProjectConfig {
  projectName: string;
  projectDescription: string;
  template: SetupTemplate;
  techStack: string;
  overwriteExisting: boolean;
  extensionPath?: string; // extension 측에서 주입, webview에서는 모름
}

export const SETUP_FILES: Record<SetupTemplate, readonly string[]> = {
  solo: ["CLAUDE.md", ".claude/settings.json", ".mcp.json"],
  team: [
    "CLAUDE.md",
    ".claude/settings.json",
    ".claude/agents/backend-dev.md",
    ".claude/agents/frontend-dev.md",
    ".claude/agents/reviewer.md",
    ".claude/skills/review/SKILL.md",
    ".claude/skills/test/SKILL.md",
    ".mcp.json",
  ],
};
