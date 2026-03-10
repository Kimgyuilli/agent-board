import { useEffect, useRef, useCallback } from "react";
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "@agent-board/shared";

interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

let vscodeApi: VSCodeApi | null = null;

function getVSCodeApi(): VSCodeApi | null {
  if (vscodeApi) return vscodeApi;
  try {
    vscodeApi = acquireVsCodeApi();
    return vscodeApi;
  } catch {
    return null;
  }
}

export function useVSCodeApi(
  onMessage?: (message: ExtensionToWebviewMessage) => void,
) {
  const api = useRef(getVSCodeApi());

  useEffect(() => {
    if (!onMessage) return;

    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      // Only accept messages from the VS Code webview host
      if (event.origin && !event.origin.startsWith("vscode-webview://")) {
        return;
      }
      onMessage(event.data);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onMessage]);

  const postMessage = useCallback((message: WebviewToExtensionMessage) => {
    api.current?.postMessage(message);
  }, []);

  return { api: api.current, postMessage };
}
