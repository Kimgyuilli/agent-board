import * as vscode from "vscode";
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "@agent-board/shared";
import type { IBoardService } from "../services/BoardClient.js";

export class BoardPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _webviewDistUri: vscode.Uri,
    private readonly _service: IBoardService,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri, this._webviewDistUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    const messageDisposable = webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      this._handleMessage(message);
    });

    webviewView.onDidDispose(() => {
      messageDisposable.dispose();
      this._view = undefined;
    });
  }

  public postMessage(message: ExtensionToWebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    try {
      switch (message.type) {
        case "request-refresh": {
          const data = await this._service.getInitData();
          this.postMessage({ type: "init-data", ...data });
          break;
        }
        case "move-task": {
          const tasks = await this._service.moveTask(
            message.taskId,
            message.targetPhaseId,
            message.position,
          );
          this.postMessage({ type: "tasks-updated", tasks });
          break;
        }
        case "update-task-status": {
          const task = await this._service.updateTaskStatus(message.taskId, message.status);
          this.postMessage({ type: "tasks-updated", tasks: [task] });
          break;
        }
        case "update-task": {
          const task = await this._service.updateTask(message.taskId, message.updates);
          this.postMessage({ type: "tasks-updated", tasks: [task] });
          break;
        }
        case "request-progress-logs": {
          const result = await this._service.getProgressLogs(message.taskId);
          this.postMessage({
            type: "progress-logs-response",
            taskId: message.taskId,
            logs: result.logs,
          });
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Agent Board: ${msg}`);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._webviewDistUri, "assets", "index.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._webviewDistUri, "assets", "index.css"),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
  <link rel="stylesheet" href="${styleUri}">
  <title>Agent Board</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
