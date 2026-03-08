export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <p className="text-sm" style={{ color: "var(--vscode-descriptionForeground)" }}>
        보드 데이터가 없습니다.
      </p>
      <p className="text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
        MCP 도구로 프로젝트와 Phase를 생성하세요.
      </p>
    </div>
  );
}
