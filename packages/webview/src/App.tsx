import { useBoardData } from "./hooks/useBoardData";
import KanbanBoard from "./components/KanbanBoard";
import EmptyState from "./components/EmptyState";

export default function App() {
  const { phases, tasks, loading } = useBoardData();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!phases?.length) {
    return (
      <div className="app-container">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="flex items-center border-b px-4 py-2" style={{ borderColor: "var(--vscode-panel-border)" }}>
        <h1 className="text-sm font-semibold">Agent Board</h1>
      </header>
      <KanbanBoard phases={phases} tasks={tasks ?? []} />
    </div>
  );
}
