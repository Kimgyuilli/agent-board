import * as vscode from "vscode";
import type { ProgressLog, Task } from "@agent-board/shared";

export class NotificationService {
  private _seenLogIds = new Set<number>();

  notify(log: ProgressLog, tasks: Task[]): void {
    if (this._seenLogIds.has(log.id)) return;
    this._seenLogIds.add(log.id);

    // Evict old IDs to prevent unbounded growth
    if (this._seenLogIds.size > 1000) {
      const arr = [...this._seenLogIds];
      this._seenLogIds = new Set(arr.slice(-500));
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
