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

/**
 * VS Code webview API 래퍼 훅.
 * acquireVsCodeApi()로 API를 취득하고, Extension→Webview 메시지 리스너를 등록한다.
 * available 플래그로 API 사용 가능 여부를 반환한다.
 */
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

  return { api: api.current, postMessage, available: api.current != null };
}
