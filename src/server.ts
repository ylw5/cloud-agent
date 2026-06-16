import { createDeepSeek } from "@ai-sdk/deepseek";
import { getSandbox, Sandbox } from "@cloudflare/sandbox";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  tool
} from "ai";
import { z } from "zod";

export { Sandbox };

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  title: string;
  sandboxId: string;
  createdAt: string;
  error: string | null;
};

const MAX_OUTPUT = 12_000;
const truncate = (text: string) =>
  text.length > MAX_OUTPUT
    ? `${text.slice(0, MAX_OUTPUT)}\n...[truncated]`
    : text;

const SYSTEM_PROMPT = [
  "You are an autonomous software agent running inside an isolated Linux sandbox.",
  "Complete the user's task by inspecting, acting, observing, and repeating.",
  "Use bash for commands, list_files/read_file/write_file for filesystem work.",
  "Do not ask for approval. Make reasonable assumptions and continue.",
  "When finished, return a clear Markdown report with what changed and how it was verified."
].join("\n");

function makeModel(env: Env) {
  const deepseek = createDeepSeek({
    apiKey: env.DEEPSEEK_API_KEY
  });

  return deepseek(env.DEEPSEEK_MODEL || "deepseek-chat");
}

function makeTools(env: Env, sandboxId: string) {
  const sandbox = () => getSandbox(env.Sandbox, sandboxId);

  return {
    bash: tool({
      description: "Run a shell command in the isolated Linux sandbox.",
      inputSchema: z.object({
        command: z.string(),
        cwd: z.string().default("/workspace")
      }),
      execute: async ({ command, cwd }) => {
        const result = await sandbox().exec(command, { cwd, timeout: 120_000 });

        return {
          success: result.success,
          exitCode: result.exitCode,
          stdout: truncate(result.stdout ?? ""),
          stderr: truncate(result.stderr ?? "")
        };
      }
    }),

    list_files: tool({
      description: "List files in a sandbox directory.",
      inputSchema: z.object({
        path: z.string().default("/workspace")
      }),
      execute: async ({ path }) => ({
        files: await sandbox().listFiles(path)
      })
    }),

    read_file: tool({
      description: "Read a UTF-8 text file from the sandbox filesystem.",
      inputSchema: z.object({
        path: z.string()
      }),
      execute: async ({ path }) => {
        const file = await sandbox().readFile(path);
        return { content: truncate(file.content) };
      }
    }),

    write_file: tool({
      description:
        "Create or overwrite a UTF-8 text file in the sandbox filesystem.",
      inputSchema: z.object({
        path: z.string(),
        content: z.string()
      }),
      execute: async ({ path, content }) => {
        await sandbox().writeFile(path, content);
        return { ok: true, path };
      }
    })
  };
}

function firstUserText(messages: typeof AIChatAgent.prototype.messages) {
  const firstUser = messages.find((message) => message.role === "user");
  const textPart = firstUser?.parts.find((part) => part.type === "text");
  return textPart && "text" in textPart ? textPart.text : "Task";
}

export class TaskAgent extends AIChatAgent<Env, TaskState> {
  chatRecovery = true;
  maxPersistedMessages = 100;

  initialState: TaskState = {
    status: "idle",
    title: "",
    sandboxId: "",
    createdAt: "",
    error: null
  };

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const sandboxId = this.name;
    const title = firstUserText(this.messages).slice(0, 80);

    this.setState({
      ...this.state,
      status: "running",
      title,
      sandboxId,
      createdAt: this.state.createdAt || new Date().toISOString(),
      error: null
    });

    const result = streamText({
      model: makeModel(this.env),
      system: SYSTEM_PROMPT,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages"
      }),
      tools: makeTools(this.env, sandboxId),
      stopWhen: stepCountIs(25),
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse({
      onFinish: ({ isAborted }) => {
        this.setState({
          ...this.state,
          status: isAborted ? "idle" : "done",
          error: null
        });
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.setState({ ...this.state, status: "error", error: message });
        return message;
      }
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
