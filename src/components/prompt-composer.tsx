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
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/speech-to-text";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "ai";

type PromptComposerProps = {
  className?: string;
  disabled?: boolean;
  onStop?: () => void;
  placeholder: string;
  status?: ChatStatus;
  textareaClassName?: string;
  onSubmit: (text: string) => void | Promise<void>;
};

export function PromptComposer({
  className,
  disabled,
  onStop,
  placeholder,
  status,
  textareaClassName,
  onSubmit
}: PromptComposerProps) {
  const [input, setInput] = useState("");

  function appendTranscription(text: string) {
    setInput((current) => (current.trim() ? `${current} ${text}` : text));
  }

  async function handleSubmit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text || disabled) return;
    await onSubmit(text);
    setInput("");
  }

  const running = status === "submitted" || status === "streaming";

  return (
    <div className={cn(className)}>
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            className={textareaClassName}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools></PromptInputTools>
          <div className="flex items-center gap-2">
            <SpeechInput
              aria-label="Start voice input"
              className={
                running
                  ? "bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
                  : ""
              }
              lang="zh-CN"
              onAudioRecorded={transcribeAudio}
              onTranscriptionChange={appendTranscription}
              size="icon"
            />
            {running && (
              <PromptInputSubmit
                className="rounded-full"
                onStop={onStop}
                status={status}
                variant="default"
              />
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
