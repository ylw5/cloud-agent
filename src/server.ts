import { createDeepSeek } from "@ai-sdk/deepseek";
import { getSandbox, Sandbox, type DirectoryBackup } from "@cloudflare/sandbox";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import type { ChatResponseResult } from "agents/chat";
import { DurableObject } from "cloudflare:workers";
import { routeAgentRequest } from "agents";
import {
  consumeStream,
  convertToModelMessages,
  generateText,
  pruneMessages,
  stepCountIs,
  streamText,
  type ModelMessage,
  type StreamTextOnFinishCallback,
  type ToolSet
} from "ai";
import { z } from "zod";

import { buildContextMessages } from "@/lib/context-memory";
import { makeTools } from "@/tools";

export { Sandbox };

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  title: string;
  sandboxId: string;
  workspaceBackup: DirectoryBackup | null;
  contextSummary: string;
  summarizedMessageCount: number;
  contextCompactedAt: string;
  createdAt: string;
  runStartedAt: string;
  runTimings: Record<string, number>;
  error: string | null;
};

type TaskMeta = Pick<TaskState, "status" | "title"> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

const createTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).optional()
});

const speechLanguages = new Set(["zh", "en", "hi"]);

function base64Encode(bytes: ArrayBuffer) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

async function handleSpeechToText(request: Request, env: Env) {
  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) {
    return Response.json({ error: "Missing audio" }, { status: 400 });
  }

  if (!env.VUILABS_API_KEY) {
    return Response.json({ error: "Missing VUILABS_API_KEY" }, { status: 500 });
  }

  const language = request.headers.get("X-Speech-Language") ?? "zh";
  const result = await fetch("https://api.vuilabs.cn/v1/speech-to-text", {
    body: JSON.stringify({
      audio_data: base64Encode(audio),
      audio_format: "pcm_16000",
      language: speechLanguages.has(language) ? language : "zh"
    }),
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.VUILABS_API_KEY
    },
    method: "POST"
  });

  const data = (await result.json().catch(() => null)) as {
    message?: unknown;
    text?: unknown;
  } | null;

  if (!result.ok) {
    return Response.json(
      {
        error:
          typeof data?.message === "string"
            ? data.message
            : "Speech transcription failed"
      },
      { status: result.status }
    );
  }

  const text = typeof data?.text === "string" ? data.text : "";
  return Response.json({ text });
}

export class TaskRegistry extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT,
        status TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )`
    );
  }

  create(input: { id: string; title?: string }) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO tasks (id, title, status, createdAt, updatedAt)
       VALUES (?, ?, 'idle', ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      input.id,
      input.title ?? "",
      now,
      now
    );
    return this.get(input.id);
  }

  upsertStatus(input: {
    id: string;
    title?: string;
    status: TaskState["status"];
  }) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO tasks (id, title, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = CASE WHEN excluded.title != '' THEN excluded.title ELSE tasks.title END,
         status = excluded.status,
         updatedAt = excluded.updatedAt`,
      input.id,
      input.title ?? "",
      input.status,
      now,
      now
    );
    return this.get(input.id);
  }

  list(limit = 100) {
    return this.ctx.storage.sql
      .exec<TaskMeta>(
        "SELECT id, title, status, createdAt, updatedAt FROM tasks ORDER BY updatedAt DESC LIMIT ?",
        Math.min(Math.max(limit, 1), 100)
      )
      .toArray();
  }

  get(id: string) {
    return (
      this.ctx.storage.sql
        .exec<TaskMeta>(
          "SELECT id, title, status, createdAt, updatedAt FROM tasks WHERE id = ?",
          id
        )
        .toArray()[0] ?? null
    );
  }
}

function getRegistry(env: Env) {
  return env.TaskRegistry.get(env.TaskRegistry.idFromName("default"));
}

const SYSTEM_PROMPT = [
  "You are an autonomous software agent running inside an isolated Linux sandbox.",
  "Complete the user's task by inspecting, acting, observing, and repeating.",
  "Use bash for shell commands (ls, git, grep, find, build, run, etc.). Follow the bash tool instructions for timeouts, background processes, and git rules.",
  "Use read, edit, and write with absolute file_path values for text files — not bash cat/head/tail/sed/awk/echo.",
  "Prefer edit for targeted changes to existing files. Use write for new files or whole-file rewrites.",
  "Before edit, read the relevant file section so old_string matches exactly.",
  "Do not ask for approval. Make reasonable assumptions and continue.",
  "When finished, return a clear Markdown report with what changed and how it was verified."
].join("\n");

function makeModel(env: Env) {
  const deepseek = createDeepSeek({
    apiKey: env.DEEPSEEK_API_KEY
  });

  return deepseek(env.DEEPSEEK_MODEL || "deepseek-chat");
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
    workspaceBackup: null,
    contextSummary: "",
    summarizedMessageCount: 0,
    contextCompactedAt: "",
    createdAt: "",
    runStartedAt: "",
    runTimings: {},
    error: null
  };

  protected async onChatResponse(result: ChatResponseResult) {
    const startedAt = this.state.runStartedAt;
    const messageId = result.message?.id;
    if (!startedAt || !messageId) return;

    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    );

    this.setState({
      ...this.state,
      runTimings: {
        ...this.state.runTimings,
        [messageId]: durationSeconds
      }
    });
  }

  private async reportToRegistry(state: TaskState) {
    await getRegistry(this.env).upsertStatus({
      id: this.name,
      title: state.title || undefined,
      status: state.status
    });
  }

  private async summarizeContext(
    messages: ModelMessage[],
    previousSummary: string
  ) {
    const { text } = await generateText({
      model: makeModel(this.env),
      system: [
        "Summarize old agent context for a software task runner.",
        "Preserve user goal, current task status, files/commands touched, decisions, errors/blockers, and next steps.",
        "Be concise and factual. Mention that full historical UI messages still exist outside active model context."
      ].join("\n"),
      messages: [
        {
          role: "user",
          content:
            `Previous summary:\n${previousSummary || "(none)"}\n\n` +
            `Old messages to summarize:\n${JSON.stringify(messages)}`
        }
      ]
    });

    return text;
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: OnChatMessageOptions
  ) {
    const sandboxId = this.name;
    const sandbox = getSandbox(this.env.Sandbox, sandboxId);
    const title = firstUserText(this.messages).slice(0, 80);

    const runStartedAt = options?.continuation
      ? this.state.runStartedAt || new Date().toISOString()
      : new Date().toISOString();

    const runningState = {
      ...this.state,
      status: "running",
      title,
      sandboxId,
      workspaceBackup: this.state.workspaceBackup ?? null,
      contextSummary: this.state.contextSummary ?? "",
      summarizedMessageCount: this.state.summarizedMessageCount ?? 0,
      contextCompactedAt: this.state.contextCompactedAt ?? "",
      createdAt: this.state.createdAt || new Date().toISOString(),
      runStartedAt,
      error: null
    } satisfies TaskState;
    this.setState(runningState);
    await this.reportToRegistry(runningState);
    if (this.state.workspaceBackup) {
      await sandbox.restoreBackup(this.state.workspaceBackup);
    }

    const prunedMessages = pruneMessages({
      messages: await convertToModelMessages(this.messages),
      reasoning: "before-last-message",
      toolCalls: "before-last-2-messages"
    });

    let modelMessages = prunedMessages;
    try {
      const context = await buildContextMessages({
        messages: prunedMessages,
        memory: this.state,
        summarize: (messages, previousSummary) =>
          this.summarizeContext(messages, previousSummary)
      });
      modelMessages = context.messages;
      if (context.memory.contextCompactedAt !== this.state.contextCompactedAt) {
        this.setState({ ...this.state, ...context.memory });
      }
    } catch {
      modelMessages = prunedMessages;
    }

    const finishRun = async (status: TaskState["status"]) => {
      const workspaceBackup =
        status === "done"
          ? await sandbox.createBackup({
              dir: "/workspace",
              gitignore: true,
              ttl: 60 * 60 * 24 * 7
            })
          : this.state.workspaceBackup;
      const nextState = {
        ...this.state,
        status,
        workspaceBackup,
        error: null
      } satisfies TaskState;
      this.setState(nextState);
      await this.reportToRegistry(nextState);
    };

    const failRun = async (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      const nextState = {
        ...this.state,
        status: "error",
        error: message
      } satisfies TaskState;
      this.setState(nextState);
      await this.reportToRegistry(nextState);
      return message;
    };

    const result = streamText({
      model: makeModel(this.env),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: makeTools(sandbox),
      stopWhen: stepCountIs(25),
      abortSignal: options?.abortSignal,
      onAbort: () => finishRun("idle"),
      onError: (event) => {
        this.ctx.waitUntil(failRun(event.error));
      },
      onFinish: async (event) => {
        try {
          await onFinish(
            event as unknown as Parameters<
              StreamTextOnFinishCallback<ToolSet>
            >[0]
          );
        } finally {
          await finishRun("done");
        }
      }
    });

    return result.toUIMessageStreamResponse({
      consumeSseStream: ({ stream }) =>
        this.ctx.waitUntil(consumeStream({ stream })),
      onError: (error) => {
        const report = failRun(error);
        this.ctx.waitUntil(report);
        return error instanceof Error ? error.message : String(error);
      }
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/tasks" && request.method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? 100);
      return Response.json(
        await getRegistry(env).list(Number.isFinite(limit) ? limit : 100)
      );
    }

    if (url.pathname === "/api/tasks" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      const result = createTaskSchema.safeParse(body);
      if (!result.success) {
        return Response.json({ error: "Invalid task" }, { status: 400 });
      }
      return Response.json(await getRegistry(env).create(result.data));
    }

    if (url.pathname === "/api/speech-to-text" && request.method === "POST") {
      return handleSpeechToText(request, env);
    }

    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch && request.method === "GET") {
      const task = await getRegistry(env).get(decodeURIComponent(taskMatch[1]));
      if (!task) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }
      return Response.json(task);
    }

    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
