import * as vscode from "vscode";
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "@agent-board/shared";

export class BoardPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case "move-task":
            // TODO: Handle task move
            break;
          case "update-task-status":
            // TODO: Handle task status update
            break;
          case "update-task":
            // TODO: Handle task update
            break;
          case "request-refresh":
            // TODO: Handle refresh request
            break;
        }
      },
    );
  }

  public postMessage(message: ExtensionToWebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    // TODO: Load actual webview bundle when available
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Agent Board</title>
</head>
<body>
  <div id="root">
    <h1>Agent Board</h1>
    <p>Webview loading...</p>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Example: Request initial data
    vscode.postMessage({ type: 'request-refresh' });

    // Example: Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      console.log('Received message:', message.type);
    });
  </script>
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
