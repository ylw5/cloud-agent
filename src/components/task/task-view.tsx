import { useEffect, useRef, useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { getTask, type TaskMeta } from "@/lib/storage";
import { TaskComposer } from "./task-composer";
import { TaskFeed } from "./task-feed";
import { TaskHeader } from "./task-header";

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  title: string;
  sandboxId: string;
  createdAt: string;
  runStartedAt: string;
  runTimings: Record<string, number>;
  error: string | null;
};

type TaskViewProps = {
  taskId: string;
  initialPrompt?: string;
  onBack: () => void;
  onMetaChange?: () => void;
};

export function TaskView({
  taskId,
  initialPrompt,
  onBack,
  onMetaChange
}: TaskViewProps) {
  const sentInitial = useRef(false);
  const [meta, setMeta] = useState<TaskMeta | undefined>();
  const [taskState, setTaskState] = useState<TaskState | null>(null);

  const agent = useAgent<TaskState>({
    agent: "TaskAgent",
    name: taskId,
    onStateUpdate: (state) => {
      setTaskState(state);
      onMetaChange?.();
    }
  });

  const { messages, sendMessage, status, stop } = useAgentChat({
    agent
  });

  const running = status !== "ready";
  const displayStatus =
    running || !meta?.status ? taskState?.status : meta.status;
  const feedTaskState =
    taskState && (running || taskState.status !== "running")
      ? taskState
      : meta
        ? {
            status: meta.status,
            runStartedAt: meta.status === "running" ? meta.updatedAt : undefined
          }
        : null;
  const title =
    taskState?.title ||
    meta?.title ||
    initialPrompt?.slice(0, 80) ||
    "New task";

  useEffect(() => {
    sentInitial.current = false;
  }, [taskId]);

  useEffect(() => {
    let ignore = false;
    setMeta(undefined);
    getTask(taskId)
      .then((task) => {
        if (!ignore) setMeta(task);
      })
      .catch(() => {
        if (!ignore) setMeta(undefined);
      });
    return () => {
      ignore = true;
    };
  }, [taskId]);

  useEffect(() => {
    if (!initialPrompt || sentInitial.current || messages.length > 0) return;
    sentInitial.current = true;
    sendMessage({ text: initialPrompt });
  }, [initialPrompt, messages.length, sendMessage]);

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <TaskHeader
        meta={meta}
        onBack={onBack}
        status={displayStatus}
        title={title}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TaskFeed
          isStreaming={running}
          messages={messages}
          stickToBottomOnOpen={!!initialPrompt}
          taskState={feedTaskState}
        />
        <div className="mx-auto w-full max-w-3xl shrink-0">
          <TaskComposer
            onStop={stop}
            onSubmit={(text) => sendMessage({ text })}
            status={status}
          />
        </div>
      </div>
    </div>
  );
}
