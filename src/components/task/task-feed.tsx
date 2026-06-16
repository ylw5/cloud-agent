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
  createdAt: string;
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
      <ConversationContent className="gap-4 px-4 pt-4 pb-2">
        {messages.map((message, index) => (
          <MessageParts
            isLastMessage={index === messages.length - 1}
            isStreaming={isStreaming}
            key={message.id}
            message={message}
          />
        ))}
        <TaskStatusRows hasMessages={messages.length > 0} state={taskState} />
        <div className="flex-1 min-h-20"></div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
