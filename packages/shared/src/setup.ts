export type SetupTemplate = "solo" | "team";

export interface SetupProjectConfig {
  projectName: string;
  projectDescription: string;
  template: SetupTemplate;
  techStack: string;
  overwriteExisting: boolean;
}

export const SETUP_FILES: Record<SetupTemplate, readonly string[]> = {
  solo: ["CLAUDE.md", ".claude/settings.json"],
  team: [
    "CLAUDE.md",
    ".claude/settings.json",
    ".claude/agents/backend-dev.md",
    ".claude/agents/frontend-dev.md",
    ".claude/agents/reviewer.md",
    ".claude/skills/review/SKILL.md",
    ".claude/skills/test/SKILL.md",
  ],
};
