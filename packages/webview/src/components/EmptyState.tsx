interface EmptyStateProps {
  archivedPhaseCount: number;
  onShowArchived?: () => void;
}

export default function EmptyState({ archivedPhaseCount, onShowArchived }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <p className="text-sm" style={{ color: "var(--vscode-descriptionForeground)" }}>
        보드 데이터가 없습니다.
      </p>
      {archivedPhaseCount > 0 ? (
        <>
          <p className="text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
            {archivedPhaseCount}개의 아카이브된 Phase가 있습니다.
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
      ) : (
        <p className="text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
          MCP 도구로 프로젝트와 Phase를 생성하세요.
        </p>
      )}
    </div>
  );
}
