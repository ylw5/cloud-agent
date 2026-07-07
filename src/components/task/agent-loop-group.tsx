import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import prettyMilliseconds from "pretty-ms";
import { useEffect, useState, type ReactNode } from "react";

type AgentLoopGroupProps = {
  children: ReactNode;
  isLastMessage: boolean;
  isStreaming: boolean;
  taskStatus?: "idle" | "running" | "done" | "error";
  runStartedAt?: string;
  durationSeconds?: number;
};

function elapsedSeconds(startedAt: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  );
}

function formatWorkedDuration(seconds: number) {
  return prettyMilliseconds(seconds * 1000, {
    secondsDecimalDigits: 0
  });
}

function formatDurationLabel(prefix: string, seconds: number) {
  return `${prefix} ${formatWorkedDuration(seconds)}`;
}

function isActiveLoop(
  isLastMessage: boolean,
  isStreaming: boolean,
  taskStatus?: AgentLoopGroupProps["taskStatus"]
) {
  return isLastMessage && (isStreaming || taskStatus === "running");
}

export function AgentLoopGroup({
  children,
  isLastMessage,
  isStreaming,
  taskStatus,
  runStartedAt,
  durationSeconds
}: AgentLoopGroupProps) {
  const isRunning = isActiveLoop(isLastMessage, isStreaming, taskStatus);
  const [elapsed, setElapsed] = useState(() =>
    runStartedAt ? elapsedSeconds(runStartedAt) : 0
  );
  const [open, setOpen] = useState(isRunning);

  useEffect(() => {
    if (!isRunning || !runStartedAt) return;
    setElapsed(elapsedSeconds(runStartedAt));
    const timer = window.setInterval(() => {
      setElapsed(elapsedSeconds(runStartedAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runStartedAt, isRunning]);

  useEffect(() => {
    if (isRunning || !runStartedAt) return;
    setElapsed(elapsedSeconds(runStartedAt));
  }, [runStartedAt, isRunning]);

  useEffect(() => {
    if (isRunning) {
      setOpen(true);
      return;
    }

    const timer = window.setTimeout(() => setOpen(false), 800);
    return () => window.clearTimeout(timer);
  }, [isRunning]);

  const finishedDuration = durationSeconds ?? (runStartedAt ? elapsed : null);
  const label = isRunning
    ? formatDurationLabel("Working for", elapsed)
    : taskStatus === "error" && isLastMessage
      ? finishedDuration === null
        ? "Run failed"
        : formatDurationLabel("Failed after", finishedDuration)
      : finishedDuration === null
        ? "Work log"
        : formatDurationLabel("Worked for", finishedDuration);

  return (
    <Collapsible
      className="group flex flex-col gap-1.5"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        {label}
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
