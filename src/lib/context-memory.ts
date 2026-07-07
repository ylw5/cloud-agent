import type { ModelMessage } from "ai";

export type ContextMemory = {
  contextSummary?: string;
  summarizedMessageCount?: number;
  contextCompactedAt?: string;
};

type BuildContextInput = {
  messages: ModelMessage[];
  memory: ContextMemory;
  summarize: (
    messages: ModelMessage[],
    previousSummary: string
  ) => Promise<string>;
  now?: () => string;
};

type BuildContextResult = {
  messages: ModelMessage[];
  memory: ContextMemory;
};

const COMPACT_AFTER_TOKENS = 500_000;
const RECENT_WINDOW_TOKENS = 150_000;
const MIN_NEW_MESSAGES_TO_RESUMMARIZE = 6;

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function messageText(message: ModelMessage) {
  return JSON.stringify(message.content);
}

function estimateMessageTokens(message: ModelMessage) {
  return estimateTokens(`${message.role}:${messageText(message)}`);
}

function estimateMessagesTokens(messages: ModelMessage[]) {
  return messages.reduce(
    (total, message) => total + estimateMessageTokens(message),
    0
  );
}

function recentWindow(messages: ModelMessage[]) {
  let tokens = 0;
  let start = messages.length;

  for (let index = messages.length - 1; index >= 0; index--) {
    tokens += estimateMessageTokens(messages[index]);
    start = index;
    if (tokens >= RECENT_WINDOW_TOKENS) break;
  }

  while (start > 0 && messages[start].role === "tool") {
    start--;
  }

  return {
    oldMessages: messages.slice(0, start),
    recentMessages: messages.slice(start)
  };
}

function summaryMessage(summary: string): ModelMessage {
  return {
    role: "user",
    content:
      `Previous conversation summary:\n${summary}\n\n` +
      "Full historical UI messages are still persisted outside the active model context."
  };
}

export async function buildContextMessages({
  messages,
  memory,
  summarize,
  now = () => new Date().toISOString()
}: BuildContextInput): Promise<BuildContextResult> {
  if (estimateMessagesTokens(messages) <= COMPACT_AFTER_TOKENS) {
    return { messages, memory };
  }

  const { oldMessages, recentMessages } = recentWindow(messages);
  const newMessages = messages.length - (memory.summarizedMessageCount ?? 0);
  const shouldSummarize =
    oldMessages.length > 0 &&
    (!memory.contextSummary || newMessages >= MIN_NEW_MESSAGES_TO_RESUMMARIZE);

  if (!shouldSummarize && memory.contextSummary) {
    return {
      messages: [summaryMessage(memory.contextSummary), ...recentMessages],
      memory
    };
  }

  const contextSummary = await summarize(
    oldMessages,
    memory.contextSummary ?? ""
  );
  const nextMemory = {
    ...memory,
    contextSummary,
    summarizedMessageCount: messages.length,
    contextCompactedAt: now()
  };

  return {
    messages: [summaryMessage(contextSummary), ...recentMessages],
    memory: nextMemory
  };
}
