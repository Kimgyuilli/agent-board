import { vi } from "vitest";

export const showInformationMessage = vi.fn().mockResolvedValue(undefined);
export const showWarningMessage = vi.fn().mockResolvedValue(undefined);
export const showErrorMessage = vi.fn().mockResolvedValue(undefined);
export const createOutputChannel = vi.fn(() => ({
  appendLine: vi.fn(),
  dispose: vi.fn(),
}));

export const getConfiguration = vi.fn(() => ({
  get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
}));

export const createFileSystemWatcher = vi.fn(() => ({
  onDidChange: vi.fn((cb: () => void) => {
    (createFileSystemWatcher as unknown as { _changeHandler: (() => void) | null })._changeHandler = cb;
    return { dispose: vi.fn() };
  }),
  onDidCreate: vi.fn((cb: () => void) => {
    (createFileSystemWatcher as unknown as { _createHandler: (() => void) | null })._createHandler = cb;
    return { dispose: vi.fn() };
  }),
  onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
}));

export const executeCommand = vi.fn();

export function createMockVscode() {
  return {
    window: {
      showInformationMessage,
      showWarningMessage,
      showErrorMessage,
      createOutputChannel,
    },
    workspace: {
      getConfiguration,
      createFileSystemWatcher,
    },
    commands: {
      executeCommand,
    },
    Uri: {
      file: (path: string) => ({
        path: path.replace(/\\/g, "/"),
        fsPath: path,
        with: (change: { path?: string }) => ({
          path: change.path ?? path.replace(/\\/g, "/"),
          fsPath: path,
        }),
      }),
      joinPath: (_base: unknown, ...segments: string[]) => ({
        path: segments.join("/"),
        fsPath: segments.join("/"),
      }),
    },
    RelativePattern: vi.fn().mockImplementation((base: unknown, pattern: string) => ({
      base,
      pattern,
    })),
  };
}

export function resetVscodeMocks(): void {
  showInformationMessage.mockReset().mockResolvedValue(undefined);
  showWarningMessage.mockReset().mockResolvedValue(undefined);
  showErrorMessage.mockReset().mockResolvedValue(undefined);
  createOutputChannel.mockClear();
  getConfiguration.mockReset().mockReturnValue({
    get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
  });
  createFileSystemWatcher.mockClear();
  executeCommand.mockReset();
}
