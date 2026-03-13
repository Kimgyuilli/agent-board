export type SetupTemplate = "solo" | "team";

export interface SetupProjectConfig {
  projectName: string;
  projectDescription: string;
  template: SetupTemplate;
  techStack: string;
  overwriteExisting: boolean;
}
