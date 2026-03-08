export default function App() {
  return (
    <div className="flex h-screen flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
      <header className="flex items-center border-b border-[var(--vscode-panel-border)] px-4 py-2">
        <h1 className="text-sm font-semibold">Agent Board</h1>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <p className="text-sm text-[var(--vscode-descriptionForeground)]">
          칸반 보드가 여기에 표시됩니다.
        </p>
      </main>
    </div>
  );
}
