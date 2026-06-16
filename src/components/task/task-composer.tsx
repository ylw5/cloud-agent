import { useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";

type TaskComposerProps = {
  status: ChatStatus | "ready";
  onSubmit: (text: string) => void;
  onStop: () => void;
};

export function TaskComposer({ status, onSubmit, onStop }: TaskComposerProps) {
  const [input, setInput] = useState("");

  function handleSubmit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text) return;
    onSubmit(text);
    setInput("");
  }

  const chatStatus: ChatStatus =
    status === "ready" ? ("ready" as ChatStatus) : status;

  return (
    <div className="shrink-0 px-4 pb-4">
      <PromptInput
        onSubmit={handleSubmit}
      >
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(event) => setInput(event.target.value)}
            placeholder="Add a follow up"
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
          </PromptInputTools>
          <PromptInputSubmit
            onStop={onStop}
            status={chatStatus}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
