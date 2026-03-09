import { vi } from "vitest";

export const mockPostMessage = vi.fn();
export const mockGetState = vi.fn().mockReturnValue(null);
export const mockSetState = vi.fn();

export function installVSCodeApiMock(): void {
  (globalThis as Record<string, unknown>).acquireVsCodeApi = () => ({
    postMessage: mockPostMessage,
    getState: mockGetState,
    setState: mockSetState,
  });
}

export function simulateMessage(data: unknown): void {
  window.dispatchEvent(new MessageEvent("message", { data }));
}

export function resetVSCodeApiMock(): void {
  mockPostMessage.mockReset();
  mockGetState.mockReset().mockReturnValue(null);
  mockSetState.mockReset();
}
