# Pi-Style Context Compression For Cloud Agent

## Summary

Implement Pi-like context management in the existing `TaskAgent` path with the smallest useful diff: keep full UI/chat history in `AIChatAgent` storage, but send the model a compressed working set made of a persistent summary plus recent messages.

Do not replace `AIChatAgent`, add a memory database, or add new dependencies.

References:

- [Arize Pi context comparison](https://arize.com/blog/context-management-in-agent-harnesses/)
- [AI SDK pruneMessages](https://ai-sdk.dev/docs/reference/ai-sdk-ui/prune-messages)
- [Cloudflare Chat Agents](https://developers.cloudflare.com/agents/communication-channels/chat/chat-agents/)

## Key Changes

- Extend `TaskState` in `src/server.ts` with:
  - `contextSummary: string`
  - `summarizedMessageCount: number`
  - `contextCompactedAt: string`
- Add a small server-side context builder before `streamText()`:
  - Convert `this.messages` with `convertToModelMessages`.
  - Apply existing `pruneMessages`, plus `reasoning: "before-last-message"`.
  - If context is under budget, send pruned messages as today.
  - If over budget, summarize old messages, store the summary in state, then send a synthetic summary message plus the recent uncompressed message window.
- Use a simple token estimate, not a tokenizer dependency:
  - `estimatedTokens = Math.ceil(text.length / 4)`
  - compact when estimated context exceeds `48_000` tokens
  - keep the newest estimated `20_000` tokens uncompressed
  - do not compact again unless at least 6 new messages were added since `summarizedMessageCount`
- Use `generateText()` with the existing DeepSeek model for summarization.
  - Preserve: user goal, current task status, files/commands touched, decisions made, errors/blockers, and next steps.
  - State that full historical UI messages still exist outside active model context.
- Keep the existing tool-output protection:
  - `src/tools/common.ts` already truncates bash/read output to 12,000 chars.
  - `read` already supports `offset`/`limit`.
  - Only improve truncation text to include "use offset/limit or a targeted command to continue" if needed.

## Compression Behavior

- Full persisted chat history remains visible to the UI and recoverable through `AIChatAgent`.
- Only model input is compacted.
- Tool call/result boundaries must stay valid:
  - compact whole old message groups, never split recent assistant/tool pairs.
  - keep recent tool calls/results via current `toolCalls: "before-last-2-messages"`.
- If summarization fails, fall back to current pruned messages and continue the run; do not fail the agent just because compression failed.
- If even summary plus recent messages is still too large, drop oldest recent messages until under budget and add a short note to the synthetic summary that older details were omitted.

## Test Plan

- Add one small test or script-level check for the context builder:
  - short history returns normal pruned messages with no summary.
  - long history creates/uses summary and keeps recent messages.
  - repeated call with fewer than 6 new messages does not re-summarize.
  - assistant/tool boundary is not split in the recent window.
- Run:
  - `npm run lint`
  - `tsc` or `npm run check` if formatting state is clean.
- Manual smoke:
  - start a long task locally, confirm UI still shows full message history.
  - confirm server model context includes summary plus recent turns, not the full transcript.

## Assumptions

- The first implementation targets reliability, not perfect token accounting.
- No user-facing compression UI is added.
- No migration is needed; old `TaskState` rows simply default missing summary fields to empty values.
- This follows Pi's shape: bounded tool/file output, recent working window, LLM summary under context pressure, and fallback pruning.
