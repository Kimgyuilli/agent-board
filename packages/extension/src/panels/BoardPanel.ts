import * as crypto from "crypto";
import * as vscode from "vscode";
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "@agent-board/shared";
import type { IBoardService } from "../services/BoardClient.js";
import { SetupService } from "../services/SetupService.js";

/**
 * Webview 패널을 관리하는 프로바이더.
 * webview ↔ extension 간 postMessage 프로토콜로 통신하며,
 * IBoardService를 통해 board-server에 RPC 호출을 위임한다.
 */
export class BoardPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _showArchived = false;
  private _setupService?: SetupService;

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

  public showSetupWizard(): void {
    this.postMessage({ type: "show-setup-wizard" });
  }

  private _getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private _getSetupService(): SetupService | undefined {
    if (this._setupService) return this._setupService;
    const root = this._getWorkspaceRoot();
    if (!root) return undefined;
    this._setupService = new SetupService(root);
    return this._setupService;
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
          const data = await this._service.getInitData(undefined, this._showArchived);
          this.postMessage({ type: "init-data", ...data });
          break;
        }
        case "toggle-archive-visibility": {
          this._showArchived = message.show;
          const toggleData = await this._service.getInitData(undefined, this._showArchived);
          this.postMessage({ type: "init-data", ...toggleData });
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
        case "archive-phase": {
          const archiveResult = await this._service.archivePhase(
            message.phaseId,
            message.archived,
          );
          this.postMessage({ type: "phases-updated", phases: archiveResult.phases });
          this.postMessage({ type: "tasks-updated", tasks: archiveResult.tasks });
          break;
        }
        case "delete-phase": {
          const deletePhaseResult = await this._service.deletePhase(message.phaseId);
          this.postMessage({ type: "phases-updated", phases: deletePhaseResult.phases });
          this.postMessage({ type: "tasks-updated", tasks: deletePhaseResult.tasks });
          break;
        }
        case "delete-task": {
          const deleteTaskResult = await this._service.deleteTask(message.taskId);
          this.postMessage({ type: "tasks-updated", tasks: deleteTaskResult.tasks });
          break;
        }
        case "check-existing-setup": {
          const setupService = this._getSetupService();
          if (!setupService) {
            this.postMessage({ type: "check-existing-setup-result", exists: false, existingFiles: [] });
            break;
          }
          const checkResult = await setupService.checkExisting();
          this.postMessage({ type: "check-existing-setup-result", ...checkResult });
          break;
        }
        case "setup-project": {
          const setupService = this._getSetupService();
          if (!setupService) {
            this.postMessage({ type: "setup-result", success: false, filesCreated: [], filesSkipped: [], error: "No workspace folder open" });
            break;
          }
          const configWithPath = { ...message.config, extensionPath: this._extensionUri.fsPath };
          const setupResult = await setupService.scaffold(configWithPath);
          this.postMessage({ type: "setup-result", ...setupResult });
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Agent Board: ${msg}`);
      this.postMessage({ type: "error", source: message.type, message: msg });
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
  return crypto.randomBytes(16).toString("hex");
}
