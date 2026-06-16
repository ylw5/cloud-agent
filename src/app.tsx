import { useState, type FormEvent } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { Streamdown } from "streamdown";

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  title: string;
  sandboxId: string;
  createdAt: string;
  error: string | null;
};

const taskKey = "cloud-agent:tasks";

function getSavedTasks() {
  try {
    return JSON.parse(localStorage.getItem(taskKey) || "[]") as string[];
  } catch {
    return [];
  }
}

function saveTask(id: string) {
  const tasks = [id, ...getSavedTasks().filter((task) => task !== id)].slice(
    0,
    10
  );
  localStorage.setItem(taskKey, JSON.stringify(tasks));
}

function StatusBadge({ state }: { state: TaskState | null }) {
  const status = state?.status || "idle";
  const color =
    status === "running"
      ? "bg-blue-100 text-blue-700"
      : status === "done"
        ? "bg-green-100 text-green-700"
        : status === "error"
          ? "bg-red-100 text-red-700"
          : "bg-zinc-100 text-zinc-700";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-5 py-4">
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>
        {status}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-900">
          {state?.title || "New task"}
        </div>
        <div className="truncate text-xs text-zinc-500">
          {state?.sandboxId ? `sandbox ${state.sandboxId}` : "sandbox pending"}
        </div>
      </div>
    </div>
  );
}

function ToolPart({ part }: { part: UIMessage["parts"][number] }) {
  if (!isToolUIPart(part)) return null;

  const name = getToolName(part);
  const done = part.state === "output-available";
  const failed = part.state === "output-error";

  return (
    <details
      className="rounded-md border border-zinc-200 bg-white"
      open={!done}
    >
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-800">
        {done ? "Done" : failed ? "Error" : "Running"} {name}
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-zinc-200 bg-zinc-950 p-3 text-xs text-zinc-100">
        {JSON.stringify(
          {
            input: "input" in part ? part.input : undefined,
            output: "output" in part ? part.output : undefined,
            error: "errorText" in part ? part.errorText : undefined
          },
          null,
          2
        )}
      </pre>
    </details>
  );
}

function Message({ message }: { message: UIMessage }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {message.role}
      </div>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div
              key={index}
              className="prose prose-zinc max-w-none rounded-md bg-white p-4"
            >
              <Streamdown>{part.text}</Streamdown>
            </div>
          );
        }

        if (part.type === "reasoning") {
          return (
            <details key={index} className="rounded-md bg-zinc-100 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Reasoning
              </summary>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {part.text}
              </div>
            </details>
          );
        }

        return <ToolPart key={index} part={part} />;
      })}
    </div>
  );
}

export default function App() {
  const [taskId, setTaskId] = useState(() => {
    const [saved] = getSavedTasks();
    const id = saved || crypto.randomUUID();
    saveTask(id);
    return id;
  });
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [input, setInput] = useState("");
  const savedTasks = getSavedTasks();

  const agent = useAgent<TaskState>({
    agent: "TaskAgent",
    name: taskId,
    onStateUpdate: setTaskState
  });

  const { messages, sendMessage, status, stop, clearHistory } = useAgentChat({
    agent
  });

  const running = status !== "ready";

  function newTask() {
    const id = crypto.randomUUID();
    saveTask(id);
    setTaskId(id);
    setTaskState(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || running) return;
    saveTask(taskId);
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="min-h-full bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div>
            <h1 className="text-xl font-semibold">Cloud Agent</h1>
            <p className="text-sm text-zinc-600">
              Autonomous task runner backed by a Cloudflare Sandbox.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Saved tasks"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
            >
              {savedTasks.map((id) => (
                <option key={id} value={id}>
                  {id.slice(0, 8)}
                </option>
              ))}
            </select>
            <button
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
              onClick={newTask}
              type="button"
            >
              New task
            </button>
            <button
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
              onClick={clearHistory}
              type="button"
            >
              Clear
            </button>
          </div>
        </header>

        <section className="mx-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
          <StatusBadge state={taskState} />

          <div className="flex-1 space-y-6 overflow-auto p-5">
            {messages.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
                Submit a task to start an autonomous sandbox run.
              </div>
            ) : (
              messages.map((message) => (
                <Message key={message.id} message={message} />
              ))
            )}
          </div>

          <form
            className="flex gap-3 border-t border-zinc-200 bg-white p-4"
            onSubmit={submit}
          >
            <textarea
              aria-label="Task prompt"
              className="min-h-20 flex-1 resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Clone a repo, inspect files, run tests, and write a report..."
              value={input}
            />
            <div className="flex w-24 flex-col gap-2">
              {running ? (
                <button
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                  onClick={stop}
                  type="button"
                >
                  Stop
                </button>
              ) : (
                <button
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                  disabled={!input.trim()}
                  type="submit"
                >
                  Run
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
