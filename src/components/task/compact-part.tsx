import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  formatToolOutput,
  getBashTitle,
  getToolLabel,
  getToolName,
  type ToolPart
} from "@/lib/tool-labels";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ReactDiffViewer from "react-diff-viewer-continued";

type CompactThoughtProps = {
  text: string;
  isStreaming: boolean;
};

export function CompactThought({ text, isStreaming }: CompactThoughtProps) {
  const [open, setOpen] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
      return;
    }

    const timer = window.setTimeout(() => setOpen(false), 800);
    return () => window.clearTimeout(timer);
  }, [isStreaming]);

  const label = isStreaming ? (
    <Shimmer duration={1}>Thinking...</Shimmer>
  ) : (
    "Thought"
  );

  return (
    <Collapsible className="group" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        {label}
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground max-h-56 overflow-auto">
          {text}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

type CompactToolProps = {
  part: ToolPart;
  running: boolean;
};

type FileChangeOutput = {
  path: string;
  oldValue: string;
  newValue: string;
  additions?: number;
  deletions?: number;
  truncated?: boolean;
};

function getFileChangeOutput(part: ToolPart): FileChangeOutput | null {
  if (part.state !== "output-available" || !("output" in part)) return null;

  const output = part.output;
  if (!output || typeof output !== "object") return null;

  const candidate = output as Partial<FileChangeOutput>;
  return typeof candidate.path === "string" &&
    typeof candidate.oldValue === "string" &&
    typeof candidate.newValue === "string"
    ? {
        path: candidate.path,
        oldValue: candidate.oldValue,
        newValue: candidate.newValue,
        additions: candidate.additions,
        deletions: candidate.deletions,
        truncated: candidate.truncated
      }
    : null;
}

function BashTool({ part, running }: CompactToolProps) {
  const title = getBashTitle(part);
  const output = formatToolOutput(part);
  const errorText = "errorText" in part ? part.errorText : undefined;
  const details = output || errorText;
  const [open, setOpen] = useState(running);

  useEffect(() => {
    if (running) setOpen(true);
    else if (details) {
      const timer = window.setTimeout(() => setOpen(false), 600);
      return () => window.clearTimeout(timer);
    }
  }, [running, details]);

  if (!title) return null;

  const boxClass =
    "w-full overflow-hidden rounded-lg border border-border/60 bg-muted/20";

  const titleClass = "min-w-0 flex-1 truncate text-sm leading-5";

  if (!details) {
    return (
      <div
        className={cn(
          boxClass,
          "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
        )}
      >
        <span className="inline-flex size-3.5 shrink-0 items-center justify-center font-mono text-xs leading-none">
          $
        </span>
        <span className={titleClass}>{title}</span>
      </div>
    );
  }

  return (
    <Collapsible
      className="group/bash w-full"
      onOpenChange={setOpen}
      open={open}
    >
      <div className={boxClass}>
        <CollapsibleTrigger className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <span className="relative inline-flex size-3.5 shrink-0 items-center justify-center">
            <span
              className={cn(
                "font-mono text-xs leading-none transition-opacity",
                open ? "opacity-0" : "group-hover/bash:opacity-0"
              )}
            >
              $
            </span>
            <ChevronRightIcon
              className={cn(
                "absolute size-3.5 transition-all",
                open
                  ? "rotate-90 opacity-100"
                  : "opacity-0 group-hover/bash:opacity-100"
              )}
            />
          </span>
          <span className={titleClass}>{title}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/40 px-3 pt-2 pb-3">
            <pre
              className={cn(
                "max-h-56 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap",
                errorText ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {errorText ?? output}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function CompactTool({ part, running }: CompactToolProps) {
  const toolName = getToolName(part);

  if (toolName === "bash") {
    return <BashTool part={part} running={running} />;
  }

  if (toolName === "edit" || toolName === "write") {
    const output = getFileChangeOutput(part);
    if (output) {
      return <FileDiffTool output={output} part={part} running={running} />;
    }
  }

  return <GenericTool part={part} running={running} />;
}

function FileDiffTool({
  output,
  part,
  running
}: CompactToolProps & { output: FileChangeOutput }) {
  const label = getToolLabel(part);
  const [open, setOpen] = useState(running);
  const fileName = output.path.split("/").pop() || output.path;

  useEffect(() => {
    if (running) setOpen(true);
    else {
      const timer = window.setTimeout(() => setOpen(false), 600);
      return () => window.clearTimeout(timer);
    }
  }, [running]);

  return (
    <Collapsible
      className="group/file-diff w-full"
      onOpenChange={setOpen}
      open={open}
    >
      <div className="w-full overflow-hidden rounded-lg border border-border/60 bg-background">
        <CollapsibleTrigger className="flex w-full min-w-0 items-center gap-2 border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-muted/30">
          <ChevronRightIcon
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90"
            )}
          />
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {label}
          </span>
          <span className="shrink-0 font-mono text-xs text-emerald-600">
            +{output.additions ?? 0}
          </span>
          <span className="shrink-0 font-mono text-xs text-rose-600">
            -{output.deletions ?? 0}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="max-h-96 overflow-auto">
            <ReactDiffViewer
              disableWorker
              extraLinesSurroundingDiff={3}
              hideSummary
              leftTitle={fileName}
              newValue={output.newValue}
              oldValue={output.oldValue}
              rightTitle={fileName}
              showDiffOnly
              splitView={false}
              styles={{
                contentText: {
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "12px",
                  lineHeight: "20px"
                },
                lineNumber: {
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "12px"
                },
                variables: {
                  dark: {
                    addedBackground: "rgba(16, 185, 129, 0.14)",
                    addedColor: "inherit",
                    removedBackground: "rgba(244, 63, 94, 0.14)",
                    removedColor: "inherit"
                  },
                  light: {
                    addedBackground: "rgba(16, 185, 129, 0.14)",
                    addedColor: "inherit",
                    removedBackground: "rgba(244, 63, 94, 0.14)",
                    removedColor: "inherit"
                  }
                }
              }}
              useDarkTheme={false}
            />
          </div>
          {output.truncated ? (
            <div className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
              Diff content truncated.
            </div>
          ) : null}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function GenericTool({ part, running }: CompactToolProps) {
  const label = getToolLabel(part);
  const output = formatToolOutput(part);
  const errorText = "errorText" in part ? part.errorText : undefined;
  const details = output || errorText;
  const [open, setOpen] = useState(running);

  useEffect(() => {
    if (running) setOpen(true);
    else if (details) {
      const timer = window.setTimeout(() => setOpen(false), 600);
      return () => window.clearTimeout(timer);
    }
  }, [running, details]);

  if (!details) {
    return <div className="py-0.5 text-sm text-muted-foreground">{label}</div>;
  }

  return (
    <Collapsible className="group py-0.5" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger className="flex w-full min-w-0 items-center gap-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground">
        <span>{label}</span>
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre
          className={cn(
            "mt-1.5 max-h-56 overflow-auto rounded-lg border border-border/40 bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap",
            errorText ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {errorText ?? output}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
