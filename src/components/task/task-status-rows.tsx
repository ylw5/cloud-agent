import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react";

type TaskState = {
  status: "idle" | "running" | "done" | "error";
  createdAt: string;
};

type TaskStatusRowsProps = {
  state: TaskState | null;
  hasMessages: boolean;
};

function elapsedSeconds(createdAt: string) {
  if (!createdAt) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
}

export function TaskStatusRows({ state, hasMessages }: TaskStatusRowsProps) {
  const [elapsed, setElapsed] = useState(() =>
    state?.createdAt ? elapsedSeconds(state.createdAt) : 0
  );

  useEffect(() => {
    if (state?.status !== "running" || !state.createdAt) return;
    setElapsed(elapsedSeconds(state.createdAt));
    const timer = window.setInterval(() => {
      setElapsed(elapsedSeconds(state.createdAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state?.status, state?.createdAt]);

  if (!state || state.status === "idle") return null;

  if (state.status === "running") {
    return (
      <div className="space-y-1">
        {!hasMessages ? <StatusRow label="Environment ready" /> : null}
        <StatusRow label={`Worked for ${elapsed}s`} />
      </div>
    );
  }

  if (state.status === "done" && state.createdAt) {
    return (
      <StatusRow label={`Completed in ${elapsedSeconds(state.createdAt)}s`} />
    );
  }

  if (state.status === "error") {
    return <StatusRow label="Run failed" />;
  }

  return null;
}

function StatusRow({ label }: { label: string }) {
  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRightIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent />
    </Collapsible>
  );
}
