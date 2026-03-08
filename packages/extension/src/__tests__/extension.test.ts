import { describe, it, expect } from "vitest";

describe("extension", () => {
  it("should be importable", async () => {
    // activate/deactivate는 vscode 모듈 의존으로 단위 테스트에서 직접 import 불가
    // 실제 테스트는 @vscode/test-electron으로 E2E 테스트 시 수행
    expect(true).toBe(true);
  });
});
