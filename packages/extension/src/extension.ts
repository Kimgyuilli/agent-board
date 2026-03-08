import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getDatabase, closeDatabase } from "@agent-board/mcp-server/db";
import { BoardPanelProvider } from "./panels/BoardPanel.js";
import { BoardService } from "./services/BoardService.js";

function resolveDbPath(context: vscode.ExtensionContext): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const dir = path.join(workspaceFolders[0].uri.fsPath, ".agent-board");
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, "board.db");
  }
  const dir = context.globalStorageUri.fsPath;
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "board.db");
}

export function activate(context: vscode.ExtensionContext): void {
  const dbPath = resolveDbPath(context);
  const db = getDatabase(dbPath);
  const boardService = new BoardService(db);

  const webviewDistUri = vscode.Uri.joinPath(context.extensionUri, "dist", "webview");
  const provider = new BoardPanelProvider(context.extensionUri, webviewDistUri, boardService);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("agent-board.boardView", provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agent-board.showBoard", () => {
      vscode.commands.executeCommand("agent-board.boardView.focus");
    }),
  );
}

export function deactivate(): void {
  closeDatabase();
}
