import { useEffect } from "react";
import type { ExtensionToWebviewMessage, SetupTemplate } from "@agent-board/shared";
import { useSetupWizard } from "../hooks/useSetupWizard";

interface SetupWizardProps {
  onClose: () => void;
  postMessage: (msg: unknown) => void;
  setSetupHandler: (handler: ((msg: ExtensionToWebviewMessage) => void) | null) => void;
}

const SOLO_FILES = ["CLAUDE.md", ".claude/settings.json"];
const TEAM_FILES = [
  "CLAUDE.md",
  ".claude/settings.json",
  ".claude/agents/backend-dev.md",
  ".claude/agents/frontend-dev.md",
  ".claude/agents/reviewer.md",
  ".claude/skills/review/SKILL.md",
  ".claude/skills/test/SKILL.md",
];

export default function SetupWizard({ onClose, postMessage, setSetupHandler }: SetupWizardProps) {
  const wizard = useSetupWizard(postMessage);

  useEffect(() => {
    setSetupHandler(wizard.handleMessage);
    return () => setSetupHandler(null);
  }, [setSetupHandler, wizard.handleMessage]);

  const files = wizard.config.template === "team" ? TEAM_FILES : SOLO_FILES;
  const hasExisting = wizard.existingFiles != null && wizard.existingFiles.length > 0;

  return (
    <div className="wizard-container">
      {/* Step Indicator */}
      <div className="wizard-steps">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`wizard-step-dot${i === wizard.step ? " wizard-step-dot--active" : ""}${i < wizard.step ? " wizard-step-dot--completed" : ""}`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {wizard.step === 0 && (
          <>
            <h2 className="text-sm font-semibold" style={{ color: "var(--vscode-foreground)" }}>
              Project Info
            </h2>
            <div className="modal-field">
              <label className="modal-label">Project Name *</label>
              <input
                className="modal-input"
                type="text"
                placeholder="My Project"
                value={wizard.config.projectName}
                onChange={(e) => wizard.updateConfig({ projectName: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Description</label>
              <textarea
                className="modal-input modal-textarea"
                placeholder="Brief project description"
                value={wizard.config.projectDescription}
                onChange={(e) => wizard.updateConfig({ projectDescription: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Tech Stack</label>
              <input
                className="modal-input"
                type="text"
                placeholder="TypeScript, React, Node.js"
                value={wizard.config.techStack}
                onChange={(e) => wizard.updateConfig({ techStack: e.target.value })}
              />
            </div>
          </>
        )}

        {wizard.step === 1 && (
          <>
            <h2 className="text-sm font-semibold" style={{ color: "var(--vscode-foreground)" }}>
              Select Template
            </h2>
            <TemplateCard
              title="Solo Developer"
              description="Single developer workflow. Creates CLAUDE.md and basic settings."
              files={SOLO_FILES}
              selected={wizard.config.template === "solo"}
              onClick={() => wizard.updateConfig({ template: "solo" as SetupTemplate })}
            />
            <TemplateCard
              title="Multi-Agent Team"
              description="Orchestrator + sub-agents workflow. Creates CLAUDE.md, agent definitions, and skill files."
              files={TEAM_FILES}
              selected={wizard.config.template === "team"}
              onClick={() => wizard.updateConfig({ template: "team" as SetupTemplate })}
            />
          </>
        )}

        {wizard.step === 2 && !wizard.result && (
          <>
            <h2 className="text-sm font-semibold" style={{ color: "var(--vscode-foreground)" }}>
              Preview
            </h2>
            <div className="file-tree">
              {files.map((f) => (
                <div key={f} className="file-tree__item">{f}</div>
              ))}
            </div>
            {hasExisting && (
              <div className="wizard-warning">
                <p className="mb-1 text-xs font-semibold">Existing files detected:</p>
                <ul className="mb-2 list-inside list-disc text-xs">
                  {wizard.existingFiles!.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={wizard.config.overwriteExisting}
                    onChange={(e) => wizard.updateConfig({ overwriteExisting: e.target.checked })}
                  />
                  Overwrite existing files
                </label>
              </div>
            )}
          </>
        )}

        {wizard.step === 2 && wizard.result && (
          <>
            {wizard.result.success ? (
              <>
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--vscode-testing-iconPassed)" }}
                >
                  Setup complete!
                </h2>
                {wizard.result.filesCreated.length > 0 && (
                  <div className="modal-field">
                    <label className="modal-label">Created</label>
                    <div className="file-tree">
                      {wizard.result.filesCreated.map((f) => (
                        <div key={f} className="file-tree__item">{f}</div>
                      ))}
                    </div>
                  </div>
                )}
                {wizard.result.filesSkipped.length > 0 && (
                  <div className="modal-field">
                    <label className="modal-label">Skipped (already exist)</label>
                    <div className="file-tree">
                      {wizard.result.filesSkipped.map((f) => (
                        <div key={f} className="file-tree__item">{f}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="wizard-warning">
                <p className="text-xs font-semibold" style={{ color: "var(--vscode-errorForeground)" }}>
                  Setup failed
                </p>
                <p className="text-xs">{wizard.result.error}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="wizard-footer">
        {wizard.step > 0 && !wizard.result && (
          <button className="btn-secondary" onClick={wizard.prevStep}>
            Back
          </button>
        )}
        {wizard.step < 2 && (
          <button
            className="btn-primary"
            disabled={wizard.step === 0 && !wizard.config.projectName.trim()}
            onClick={wizard.nextStep}
          >
            Next
          </button>
        )}
        {wizard.step === 2 && !wizard.result && (
          <button
            className="btn-primary"
            disabled={wizard.generating}
            onClick={wizard.generate}
          >
            {wizard.generating ? "Generating..." : "Generate"}
          </button>
        )}
        {wizard.step === 2 && wizard.result && (
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  title,
  description,
  files,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  files: string[];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`template-card${selected ? " template-card--selected" : ""}`}
      onClick={onClick}
    >
      <p className="text-xs font-semibold" style={{ color: "var(--vscode-foreground)" }}>
        {title}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
        {description}
      </p>
      <div className="mt-2 text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
        {files.map((f) => (
          <div key={f}>{f}</div>
        ))}
      </div>
    </div>
  );
}
