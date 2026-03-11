import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { BoardPanelProvider } from "./panels/BoardPanel.js";
import { BoardClient } from "./services/BoardClient.js";
import { ChangeMonitor } from "./services/ChangeMonitor.js";
import { NotificationService } from "./services/NotificationService.js";

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

function resolveServerPath(context: vscode.ExtensionContext): string {
  return path.join(context.extensionUri.fsPath, "dist", "board-server.js");
}

let boardClient: BoardClient | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const dbPath = resolveDbPath(context);
  const serverPath = resolveServerPath(context);
  const outputChannel = vscode.window.createOutputChannel("Agent Board");

  boardClient = new BoardClient(serverPath, dbPath, outputChannel, (msg) => {
    vscode.window.showErrorMessage(`Agent Board: ${msg}`);
  });

  const webviewDistUri = vscode.Uri.joinPath(context.extensionUri, "dist", "webview");
  const provider = new BoardPanelProvider(context.extensionUri, webviewDistUri, boardClient);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("agent-board.boardView", provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agent-board.showBoard", () => {
      vscode.commands.executeCommand("agent-board.boardView.focus");
    }),
  );

  // Change Monitor + Notification Service
  const notificationService = new NotificationService();
  let cachedTasks: import("@agent-board/shared").Task[] = [];

  // Cache tasks on init (with retry)
  function initWithRetry(client: BoardClient): void {
    client.getInitData().then((data) => {
      cachedTasks = data.tasks;
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      outputChannel.appendLine(`[init] ${msg}`);
      vscode.window.showWarningMessage(`Agent Board: 초기화 실패 — ${msg}`, "재시도")
        .then((sel) => {
          if (sel === "재시도") initWithRetry(client);
        });
    });
  }
  initWithRetry(boardClient);

  const changeMonitor = new ChangeMonitor(
    dbPath,
    boardClient,
    (tasks) => {
      cachedTasks = tasks;
      provider.postMessage({ type: "tasks-updated", tasks });
    },
    (logs) => {
      for (const log of logs) {
        provider.postMessage({ type: "progress-log-added", log });
        notificationService.notify(log, cachedTasks);
      }
    },
    outputChannel,
    { onPollError: (msg) => vscode.window.showWarningMessage(`Agent Board: ${msg}`) },
  );
  changeMonitor.start();

  context.subscriptions.push(changeMonitor);
  context.subscriptions.push(boardClient);
  context.subscriptions.push(outputChannel);
}

export function deactivate(): void {
  boardClient?.dispose();
  boardClient = undefined;
}
