import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import type { UIMessage } from "ai";
import { MessageParts } from "./message-parts";
import { TaskStatusRows } from "./task-status-rows";

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  runStartedAt?: string;
  runTimings?: Record<string, number>;
};

type TaskFeedProps = {
  messages: UIMessage[];
  taskState: TaskState | null;
  isStreaming: boolean;
  stickToBottomOnOpen?: boolean;
};

export function TaskFeed({
  messages,
  taskState,
  isStreaming,
  stickToBottomOnOpen = false
}: TaskFeedProps) {
  return (
    <Conversation
      className="flex-1"
      initial={stickToBottomOnOpen ? "smooth" : false}
    >
      <ConversationContent className="gap-3 pt-4 pb-2">
        <div className="mx-auto w-full max-w-3xl px-4">
          {messages.map((message, index) => (
            <MessageParts
              isLastMessage={index === messages.length - 1}
              isStreaming={isStreaming}
              key={message.id}
              message={message}
              taskState={taskState}
            />
          ))}
          <TaskStatusRows
            hasAssistantMessage={messages.some(
              (message) => message.role === "assistant"
            )}
            state={taskState}
          />
          <div className="flex-1 min-h-20"></div>
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
