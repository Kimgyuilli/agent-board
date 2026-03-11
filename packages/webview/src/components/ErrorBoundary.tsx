import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-screen flex-col items-center justify-center gap-3 p-4 text-center"
          style={{ color: "var(--vscode-errorForeground)" }}
        >
          <span className="text-lg font-semibold">Something went wrong</span>
          <span
            className="max-w-[300px] text-xs opacity-70"
            style={{ color: "var(--vscode-foreground)" }}
          >
            {this.state.error?.message ?? "Unknown error"}
          </span>
          <button
            className="mt-2 rounded px-3 py-1 text-xs"
            style={{
              background: "var(--vscode-button-background)",
              color: "var(--vscode-button-foreground)",
            }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
