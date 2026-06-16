import { PromptComposer } from "@/components/prompt-composer";

type ComposerProps = {
  disabled?: boolean;
  onSubmit: (prompt: string) => void | Promise<void>;
};

export function Composer({ disabled, onSubmit }: ComposerProps) {
  return (
    <PromptComposer
      disabled={disabled}
      onSubmit={onSubmit}
      placeholder="Ask Luna agent to build, fix bugs, explore"
      textareaClassName="min-h-28"
    />
  );
}
