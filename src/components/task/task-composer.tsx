import { PromptComposer } from "@/components/prompt-composer";
import type { ChatStatus } from "ai";

type TaskComposerProps = {
  status: ChatStatus | "ready";
  onStop: () => void;
  onSubmit: (text: string) => void;
};

export function TaskComposer({ status, onStop, onSubmit }: TaskComposerProps) {
  const chatStatus: ChatStatus =
    status === "ready" ? ("ready" as ChatStatus) : status;

  return (
    <PromptComposer
      className="shrink-0 px-4 pb-4"
      onStop={onStop}
      onSubmit={onSubmit}
      placeholder="Add a follow up"
      status={chatStatus}
    />
  );
}
