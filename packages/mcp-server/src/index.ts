import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getDatabase } from "./db/connection.js";
import {
  getProjectSummary,
  getNextTasks,
  claimTask,
  completeTask,
  blockTask,
  getTaskContext,
  addTask,
  listTasks,
} from "./db/service.js";

const server = new McpServer({
  name: "agent-board",
  version: "0.0.1",
});

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function safeCall<T>(fn: () => T) {
  try {
    return ok(fn());
  } catch (e) {
    return fail((e as Error).message);
  }
}

// sync: 프로젝트 현재 상태 요약
server.tool("sync", "프로젝트 현재 상태 요약", { project_id: z.number().optional() }, async (args) => {
  return safeCall(() => getProjectSummary(getDatabase(), args.project_id));
});

// next: 다음 수행 가능한 태스크 추천
server.tool(
  "next",
  "다음 수행 가능한 태스크 추천",
  { project_id: z.number().optional(), agent_id: z.string().optional() },
  async (args) => {
    return safeCall(() => getNextTasks(getDatabase(), args.project_id, args.agent_id));
  },
);

// claim: 태스크 할당
server.tool(
  "claim",
  "태스크 할당",
  { task_id: z.number(), agent_id: z.string() },
  async (args) => {
    return safeCall(() => claimTask(getDatabase(), args.task_id, args.agent_id));
  },
);

// complete: 태스크 완료
server.tool(
  "complete",
  "태스크 완료 처리",
  {
    task_id: z.number(),
    content: z.string().optional(),
    files_changed: z.string().optional(),
  },
  async (args) => {
    return safeCall(() => completeTask(getDatabase(), args.task_id, args.content, args.files_changed));
  },
);

// block: 태스크 블로커 기록
server.tool(
  "block",
  "태스크 블로커 기록",
  { task_id: z.number(), reason: z.string() },
  async (args) => {
    return safeCall(() => blockTask(getDatabase(), args.task_id, args.reason));
  },
);

// context: 태스크 상세 조회
server.tool("context", "태스크 상세 조회", { task_id: z.number() }, async (args) => {
  return safeCall(() => getTaskContext(getDatabase(), args.task_id));
});

// add_task: 태스크 생성
server.tool(
  "add_task",
  "새 태스크 생성",
  {
    phase_id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    depends_on: z.array(z.number()).optional(),
    position: z.number().optional(),
  },
  async (args) => {
    return safeCall(() => addTask(getDatabase(), args.phase_id, args.title, args.description, args.depends_on, args.position));
  },
);

// list_tasks: 태스크 목록 조회
server.tool(
  "list_tasks",
  "태스크 목록 조회",
  {
    project_id: z.number().optional(),
    phase_id: z.number().optional(),
    status: z.enum(["pending", "in_progress", "done", "blocked"]).optional(),
    assigned_agent: z.string().optional(),
  },
  async (args) => {
    return safeCall(() => listTasks(getDatabase(), args));
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
