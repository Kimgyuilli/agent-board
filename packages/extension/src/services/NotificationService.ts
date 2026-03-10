import * as vscode from "vscode";
import type { ProgressLog, Task } from "@agent-board/shared";

const SEEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SEEN_SIZE = 500;

export class NotificationService {
  private _seenLogs = new Map<number, number>();

  notify(log: ProgressLog, tasks: Task[]): void {
    if (this._seenLogs.has(log.id)) return;
    this._seenLogs.set(log.id, Date.now());

    // Evict expired entries when exceeding max size
    if (this._seenLogs.size > MAX_SEEN_SIZE) {
      const now = Date.now();
      for (const [id, ts] of this._seenLogs) {
        if (now - ts > SEEN_TTL_MS) {
          this._seenLogs.delete(id);
        }
      }
    }

    const task = tasks.find((t) => t.id === log.task_id);
    if (!task) return;

    const config = vscode.workspace.getConfiguration("agentBoard.notifications");

    if (log.type === "completed" && config.get("taskCompleted", true)) {
      vscode.window
        .showInformationMessage(
          `${log.agent_id ?? "Agent"} 완료: ${task.title}`,
          "보기",
        )
        .then((sel) => {
          if (sel === "보기") {
            vscode.commands.executeCommand("agent-board.showBoard");
          }
        });
    }

    if (log.type === "blocked" && config.get("taskBlocked", true)) {
      vscode.window
        .showWarningMessage(
          `${log.agent_id ?? "Agent"} 차단됨: ${task.title}`,
          "보기",
        )
        .then((sel) => {
          if (sel === "보기") {
            vscode.commands.executeCommand("agent-board.showBoard");
          }
        });
    }
  }
}
