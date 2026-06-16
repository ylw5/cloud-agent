import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react";

type TaskState = {
  status: "idle" | "running" | "done" | "error";
};

type TaskStatusRowsProps = {
  state: TaskState | null;
  hasAssistantMessage: boolean;
};

export function TaskStatusRows({
  state,
  hasAssistantMessage
}: TaskStatusRowsProps) {
  if (!state || state.status !== "running" || hasAssistantMessage) return null;

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRightIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        Environment ready
      </CollapsibleTrigger>
      <CollapsibleContent />
    </Collapsible>
  );
}
