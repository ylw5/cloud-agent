import { useEffect, useRef, useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { getTask, updateTask } from "@/lib/storage";
import { TaskComposer } from "./task-composer";
import { TaskFeed } from "./task-feed";
import { TaskHeader } from "./task-header";

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  title: string;
  sandboxId: string;
  createdAt: string;
  error: string | null;
};

type TaskViewProps = {
  taskId: string;
  initialPrompt?: string;
  onBack: () => void;
  onNewTask: () => void;
  onMetaChange?: () => void;
};

export function TaskView({
  taskId,
  initialPrompt,
  onBack,
  onNewTask,
  onMetaChange
}: TaskViewProps) {
  const sentInitial = useRef(false);
  const meta = getTask(taskId);
  const [taskState, setTaskState] = useState<TaskState | null>(null);

  const agent = useAgent<TaskState>({
    agent: "TaskAgent",
    name: taskId,
    onStateUpdate: (state) => {
      setTaskState(state);
      updateTask(taskId, {
        title: state.title || meta?.title || "",
        status: state.status,
        updatedAt: new Date().toISOString()
      });
      onMetaChange?.();
    }
  });

  const { messages, sendMessage, status, stop, clearHistory } = useAgentChat({
    agent
  });

  const running = status !== "ready";
  const title =
    taskState?.title ||
    meta?.title ||
    initialPrompt?.slice(0, 80) ||
    "New task";

  useEffect(() => {
    sentInitial.current = false;
  }, [taskId]);

  useEffect(() => {
    if (!initialPrompt || sentInitial.current || messages.length > 0) return;
    sentInitial.current = true;
    sendMessage({ text: initialPrompt });
  }, [initialPrompt, messages.length, sendMessage]);

  function handleNewTask() {
    onNewTask();
  }

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <TaskHeader
        meta={meta}
        onBack={onBack}
        onClear={clearHistory}
        onNewTask={handleNewTask}
        onStop={stop}
        running={running}
        title={title}
      />
      <div className="flex min-h-0 flex-1 justify-center overflow-hidden px-4">
        <div className="flex min-h-0 w-full max-w-3xl flex-col">
          <TaskFeed
            isStreaming={running}
            messages={messages}
            stickToBottomOnOpen={!!initialPrompt}
            taskState={taskState}
          />
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
