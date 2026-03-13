interface EmptyStateProps {
  archivedPhaseCount: number;
  onShowArchived?: () => void;
  onSetupProject?: () => void;
}

export default function EmptyState({ archivedPhaseCount, onShowArchived, onSetupProject }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-sm font-semibold" style={{ color: "var(--vscode-foreground)" }}>
        Welcome to Agent Board
      </h2>
      <p className="text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
        Get started by connecting an MCP agent and creating your first phase.
      </p>

      <div
        className="w-full max-w-xs rounded p-3 text-xs"
        style={{
          background: "var(--vscode-textBlockQuote-background)",
          border: "1px solid var(--vscode-textBlockQuote-border)",
          color: "var(--vscode-descriptionForeground)",
        }}
      >
        <p className="mb-2 font-semibold" style={{ color: "var(--vscode-foreground)" }}>
          Quick Start
        </p>
        <ol className="list-inside list-decimal space-y-1">
          <li>Connect the MCP server to your AI agent</li>
          <li>
            Create a phase: <code className="rounded px-1" style={{ background: "var(--vscode-textCodeBlock-background)" }}>add_phase</code>
          </li>
          <li>
            Add tasks: <code className="rounded px-1" style={{ background: "var(--vscode-textCodeBlock-background)" }}>add_task</code>
          </li>
        </ol>
      </div>

      <button
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{
          background: "var(--vscode-button-background)",
          color: "var(--vscode-button-foreground)",
        }}
        onClick={onSetupProject}
      >
        Setup Project
      </button>

      {archivedPhaseCount > 0 && (
        <>
          <p className="text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
            {archivedPhaseCount} archived {archivedPhaseCount === 1 ? "phase" : "phases"} available.
          </p>
          <button
            className="rounded px-3 py-1 text-xs"
            style={{
              background: "var(--vscode-button-secondaryBackground)",
              color: "var(--vscode-button-secondaryForeground)",
            }}
            onClick={onShowArchived}
          >
            Show Archived ({archivedPhaseCount})
          </button>
        </>
      )}
    </div>
  );
}
