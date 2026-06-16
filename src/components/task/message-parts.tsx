import {
  Message,
  MessageContent,
  MessageResponse
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput
} from "@/components/ai-elements/tool";
import { stripRepoContext } from "@/lib/storage";
import { formatToolOutput, getToolLabel } from "@/lib/tool-labels";
import { isToolUIPart, type UIMessage } from "ai";
import { Fragment } from "react";

type MessagePartsProps = {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
};

function isRunningTool(state: string) {
  return state === "input-available" || state === "input-streaming";
}

export function MessageParts({
  message,
  isLastMessage,
  isStreaming
}: MessagePartsProps) {
  const reasoningParts = message.parts.filter(
    (part) => part.type === "reasoning"
  );
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  return (
    <>
      {hasReasoning ? (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      ) : null}

      {message.parts.map((part, index) => {
        if (part.type === "text") {
          const text =
            message.role === "user" ? stripRepoContext(part.text) : part.text;
          if (!text.trim()) return null;

          return (
            <Message from={message.role} key={`${message.id}-text-${index}`}>
              <MessageContent>
                {message.role === "assistant" ? (
                  <MessageResponse>{text}</MessageResponse>
                ) : (
                  <span className="whitespace-pre-wrap">{text}</span>
                )}
              </MessageContent>
            </Message>
          );
        }

        if (isToolUIPart(part)) {
          const running = isRunningTool(part.state);
          const formatted = formatToolOutput(part);
          const title = getToolLabel(part);

          return (
            <Tool
              className="rounded-lg border-border/60 bg-muted/30 font-mono text-sm"
              defaultOpen={running}
              key={`${message.id}-tool-${index}`}
            >
              {part.type === "dynamic-tool" ? (
                <ToolHeader
                  state={part.state}
                  title={title}
                  toolName={part.toolName}
                  type={part.type}
                />
              ) : (
                <ToolHeader state={part.state} title={title} type={part.type} />
              )}
              <ToolContent>
                <ToolInput input={part.input} />
                <ToolOutput
                  errorText={"errorText" in part ? part.errorText : undefined}
                  output={
                    formatted ? (
                      <pre className="overflow-x-auto p-3 font-mono text-xs whitespace-pre-wrap">
                        {formatted}
                      </pre>
                    ) : null
                  }
                />
              </ToolContent>
            </Tool>
          );
        }

        return <Fragment key={`${message.id}-${index}`} />;
      })}
    </>
  );
}
