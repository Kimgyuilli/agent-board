import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, "..");
  const extensionTestsPath = path.resolve(__dirname, "out", "suite", "index");

  // Create a temporary workspace directory (needed for DB path resolution)
  const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "agent-board-e2e-"));

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [tmpWorkspace, "--disable-extensions"],
    });
  } finally {
    // Clean up temporary workspace
    fs.rmSync(tmpWorkspace, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("Failed to run E2E tests:", err);
  process.exit(1);
});
