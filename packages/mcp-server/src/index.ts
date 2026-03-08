import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "agent-board",
  version: "0.0.1",
});

// sync: 프로젝트 현재 상태 요약
server.tool("sync", "프로젝트 현재 상태 요약", { project_id: z.number().optional() }, async () => {
  return { content: [{ type: "text" as const, text: "not implemented" }] };
});

// next: 다음 수행 가능한 태스크 추천
server.tool(
  "next",
  "다음 수행 가능한 태스크 추천",
  { project_id: z.number().optional(), agent_id: z.string().optional() },
  async () => {
    return { content: [{ type: "text" as const, text: "not implemented" }] };
  },
);

// claim: 태스크 할당
server.tool(
  "claim",
  "태스크 할당",
  { task_id: z.number(), agent_id: z.string() },
  async () => {
    return { content: [{ type: "text" as const, text: "not implemented" }] };
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
  async () => {
    return { content: [{ type: "text" as const, text: "not implemented" }] };
  },
);

// block: 태스크 블로커 기록
server.tool(
  "block",
  "태스크 블로커 기록",
  { task_id: z.number(), reason: z.string() },
  async () => {
    return { content: [{ type: "text" as const, text: "not implemented" }] };
  },
);

// context: 태스크 상세 조회
server.tool("context", "태스크 상세 조회", { task_id: z.number() }, async () => {
  return { content: [{ type: "text" as const, text: "not implemented" }] };
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
  async () => {
    return { content: [{ type: "text" as const, text: "not implemented" }] };
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
  async () => {
    return { content: [{ type: "text" as const, text: "not implemented" }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
