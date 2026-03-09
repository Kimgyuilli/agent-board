import * as assert from "assert";
import * as vscode from "vscode";

suite("Agent Board Extension", () => {
  const extensionId = "agent-board.agent-board";

  function getExtension() {
    const ext = vscode.extensions.getExtension(extensionId);
    if (!ext) {
      throw new Error("Extension not found");
    }
    return ext;
  }

  test("Extension should be present", () => {
    getExtension();
  });

  test("Extension should activate", async () => {
    const extension = getExtension();
    if (!extension.isActive) {
      await extension.activate();
    }
    assert.strictEqual(extension.isActive, true);
  });

  test("Command agent-board.showBoard should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("agent-board.showBoard"),
      "agent-board.showBoard command not found",
    );
  });

  test("View contributes should include boardView", () => {
    const extension = getExtension();
    const pkg = extension.packageJSON;
    const views = pkg.contributes?.views?.["agent-board"];
    assert.ok(Array.isArray(views), "No views in agent-board container");
    const boardView = views.find((v: { id: string }) => v.id === "agent-board.boardView");
    assert.ok(boardView, "boardView not found in contributes.views");
  });
});
