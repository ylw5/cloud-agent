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
import { getSelected } from "@/lib/storage";

type ComposerProps = {
  disabled?: boolean;
  onSubmit: (prompt: string) => void;
};

export function Composer({ disabled, onSubmit }: ComposerProps) {
  const [input, setInput] = useState("");

  function handleSubmit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text || disabled) return;
    const { repo } = getSelected();
    if (!repo) return;
    onSubmit(text);
    setInput("");
  }

  const { repo } = getSelected();

  return (
    <PromptInput
      onSubmit={handleSubmit}
    >
      <PromptInputBody>
        <PromptInputTextarea
          className="min-h-28"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Cursor to build, fix bugs, explore"
          value={input}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
        </PromptInputTools>
        <PromptInputSubmit  />
      </PromptInputFooter>
    </PromptInput>
  );
}
