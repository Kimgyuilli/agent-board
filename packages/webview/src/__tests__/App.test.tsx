import { describe, it, expect } from "vitest";

describe("App", () => {
  it("should pass basic sanity check", () => {
    expect(typeof document).toBe("object");
  });
});
