import * as vscode from "vscode";
import { BoardPanelProvider } from "./panels/BoardPanel.js";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new BoardPanelProvider(context.extensionUri);

  // Register webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("agent-board.boardView", provider),
  );

  // Register command to show the board
  context.subscriptions.push(
    vscode.commands.registerCommand("agent-board.showBoard", () => {
      vscode.commands.executeCommand("agent-board.boardView.focus");
    }),
  );
}

export function deactivate(): void {
  // TODO: 확장 비활성화 로직
}
