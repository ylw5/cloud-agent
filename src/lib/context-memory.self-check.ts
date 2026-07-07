import assert from "node:assert/strict";
import type { ModelMessage } from "ai";

import { buildContextMessages } from "./context-memory.ts";

const text = (size: number) => "x".repeat(size);
const user = (content: string): ModelMessage => ({ role: "user", content });
const assistant = (content: string): ModelMessage => ({
  role: "assistant",
  content
});
const tool = (content: string): ModelMessage => ({
  role: "tool",
  content: [
    {
      type: "tool-result",
      toolCallId: "call",
      toolName: "bash",
      output: { type: "text", value: content }
    }
  ]
});

async function demo() {
  let summarizeCalls = 0;
  const summarize = async () => {
    summarizeCalls++;
    return "summary";
  };

  const short = await buildContextMessages({
    messages: [user("small")],
    memory: {},
    summarize
  });
  assert.equal(short.messages.length, 1);
  assert.equal(summarizeCalls, 0);

  const longMessages = [user(text(2_100_000)), assistant("done"), tool("ok")];
  const long = await buildContextMessages({
    messages: longMessages,
    memory: {},
    summarize,
    now: () => "now"
  });
  assert.equal(summarizeCalls, 1);
  assert.equal(long.memory.contextSummary, "summary");
  assert.equal(long.memory.summarizedMessageCount, longMessages.length);
  assert.equal(long.messages.at(-2)?.role, "assistant");
  assert.equal(long.messages.at(-1)?.role, "tool");

  const reused = await buildContextMessages({
    messages: [...longMessages, user("1"), assistant("2"), user("3")],
    memory: {
      contextSummary: "old summary",
      summarizedMessageCount: longMessages.length,
      contextCompactedAt: "then"
    },
    summarize
  });
  assert.equal(summarizeCalls, 1);
  assert.equal(reused.messages[0].role, "user");
  assert.match(String(reused.messages[0].content), /old summary/);
}

demo().catch((error) => {
  console.error(error);
  process.exit(1);
});
