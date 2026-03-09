import { vi } from "vitest";
import type { IBoardService } from "../../services/BoardClient.js";

export function createMockBoardService(
  overrides?: Partial<Record<keyof IBoardService, unknown>>,
): IBoardService {
  return {
    getInitData: vi.fn().mockResolvedValue({ phases: [], tasks: [] }),
    moveTask: vi.fn().mockResolvedValue([]),
    updateTaskStatus: vi.fn().mockResolvedValue({ id: 1 }),
    updateTask: vi.fn().mockResolvedValue({ id: 1 }),
    getChanges: vi.fn().mockResolvedValue({ tasks: [], logs: [], timestamp: "2026-01-01 00:00:00" }),
    getProgressLogs: vi.fn().mockResolvedValue({ logs: [] }),
    dispose: vi.fn(),
    ...overrides,
  } as IBoardService;
}
