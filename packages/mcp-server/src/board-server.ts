import { createInterface } from "readline";
import * as path from "path";
import * as fs from "fs";
import type { RpcRequest } from "@agent-board/shared";
import { RPC_ERROR } from "@agent-board/shared";
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

  const resolved = path.resolve(dbPath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    process.stderr.write(`DB directory does not exist: ${dir}\n`);
    process.exit(1);
  }
  if (!resolved.endsWith(".db")) {
    process.stderr.write(`DB path must end with .db: ${resolved}\n`);
    process.exit(1);
  }

  const db = getDatabase(resolved);
  process.stderr.write(`[board-server] DB opened: ${resolved}\n`);

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  rl.on("line", (line) => {
    if (!line.trim()) return;

    let request: RpcRequest;
    try {
      request = JSON.parse(line);
    } catch {
      process.stderr.write(`[board-server] parse error: ${line}\n`);
      const errResp = { jsonrpc: "2.0", id: null, error: { code: RPC_ERROR.PARSE_ERROR, message: "Invalid JSON" } };
      process.stdout.write(JSON.stringify(errResp) + "\n");
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
