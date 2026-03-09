import { createInterface } from "readline";
import type { RpcRequest } from "@agent-board/shared";
import { getDatabase, closeDatabase } from "./db/connection.js";
import { dispatch } from "./board-handler.js";

function main(): void {
  const args = process.argv.slice(2);
  const dbFlagIndex = args.indexOf("--db");
  const dbPath = dbFlagIndex >= 0 && args[dbFlagIndex + 1] ? args[dbFlagIndex + 1] : undefined;

  if (!dbPath) {
    process.stderr.write("Usage: board-server --db <path>\n");
    process.exit(1);
  }

  const db = getDatabase(dbPath);
  process.stderr.write(`[board-server] DB opened: ${dbPath}\n`);

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  rl.on("line", (line) => {
    if (!line.trim()) return;

    let request: RpcRequest;
    try {
      request = JSON.parse(line);
    } catch {
      process.stderr.write(`[board-server] parse error: ${line}\n`);
      return;
    }

    const response = dispatch(db, request);
    process.stdout.write(JSON.stringify(response) + "\n");
  });

  rl.on("close", () => {
    process.stderr.write("[board-server] stdin closed, shutting down\n");
    closeDatabase();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    process.stderr.write("[board-server] SIGTERM received, shutting down\n");
    closeDatabase();
    process.exit(0);
  });
}

main();
