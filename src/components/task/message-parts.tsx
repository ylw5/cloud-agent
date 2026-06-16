import { MessageResponse } from "@/components/ai-elements/message";
import { AgentLoopGroup } from "./agent-loop-group";
import { CompactThought, CompactTool } from "./compact-part";
import { isToolUIPart, type UIMessage } from "ai";

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  runStartedAt?: string;
  runTimings?: Record<string, number>;
};

type MessagePartsProps = {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  taskState: TaskState | null;
};

type IndexedPart = {
  part: UIMessage["parts"][number];
  index: number;
};

function isRunningTool(state: string) {
  return state === "input-available" || state === "input-streaming";
}

function isProcessPart(part: UIMessage["parts"][number]) {
  return part.type === "reasoning" || isToolUIPart(part);
}

function splitAssistantParts(parts: UIMessage["parts"]) {
  let lastProcessIndex = -1;

  for (let index = 0; index < parts.length; index++) {
    if (isProcessPart(parts[index])) {
      lastProcessIndex = index;
    }
  }

  const processParts: IndexedPart[] = [];
  const finalTextParts: IndexedPart[] = [];

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (isProcessPart(part)) {
      processParts.push({ part, index });
    } else if (part.type === "text") {
      if (index > lastProcessIndex) {
        finalTextParts.push({ part, index });
      } else {
        processParts.push({ part, index });
      }
    }
  }

  return { processParts, finalTextParts };
}

function renderPart(
  { part, index }: IndexedPart,
  message: UIMessage,
  isLastMessage: boolean,
  isStreaming: boolean,
  lastPartIndex: number
) {
  if (part.type === "reasoning") {
    const text = part.text;
    if (!text.trim()) return null;

    return (
      <CompactThought
        isStreaming={isLastMessage && isStreaming && index === lastPartIndex}
        key={`${message.id}-reasoning-${index}`}
        text={text}
      />
    );
  }

  if (part.type === "text") {
    const text = part.text;
    if (!text.trim()) return null;

    return (
      <div
        className="text-sm leading-relaxed text-foreground"
        key={`${message.id}-text-${index}`}
      >
        <MessageResponse>{text}</MessageResponse>
      </div>
    );
  }

  if (isToolUIPart(part)) {
    return (
      <CompactTool
        key={`${message.id}-tool-${index}`}
        part={part}
        running={isRunningTool(part.state)}
      />
    );
  }

  return null;
}

export function MessageParts({
  message,
  isLastMessage,
  isStreaming,
  taskState
}: MessagePartsProps) {
  if (message.role === "user") {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (!text) return null;

    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground">
          <span className="whitespace-pre-wrap">{text}</span>
        </div>
      </div>
    );
  }

  const lastPartIndex = message.parts.length - 1;
  const { processParts, finalTextParts } = splitAssistantParts(message.parts);

  return (
    <div className="flex flex-col gap-3">
      {processParts.length > 0 ? (
        <AgentLoopGroup
          durationSeconds={taskState?.runTimings?.[message.id]}
          isLastMessage={isLastMessage}
          isStreaming={isStreaming}
          runStartedAt={isLastMessage ? taskState?.runStartedAt : undefined}
          taskStatus={isLastMessage ? taskState?.status : undefined}
        >
          {processParts.map((item) =>
            renderPart(item, message, isLastMessage, isStreaming, lastPartIndex)
          )}
        </AgentLoopGroup>
      ) : null}
      {finalTextParts.map((item) =>
        renderPart(item, message, isLastMessage, isStreaming, lastPartIndex)
      )}
    </div>
  );
}
