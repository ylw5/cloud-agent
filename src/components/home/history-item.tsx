import { formatTaskDate, type TaskMeta } from "@/lib/storage";
import { getTaskStatusLabelProps } from "@/lib/task-status";
import { cn } from "@/lib/utils";

type HistoryItemProps = {
  task: TaskMeta;
  onOpen: (id: string) => void;
};

export function HistoryItem({ task, onOpen }: HistoryItemProps) {
  const title = task.title || "New task";
  const status = getTaskStatusLabelProps(task.status);

  return (
    <button
      aria-label={`Open task: ${title}`}
      className="flex w-full items-start justify-between gap-4 border-b border-border py-4 px-1.5 text-left transition-colors hover:bg-muted/50"
      onClick={() => onOpen(task.id)}
      type="button"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">{title}</div>
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {formatTaskDate(task.updatedAt)}
        </div>
      </div>
      <span
        className={cn("shrink-0 pt-0.5 text-sm tabular-nums", status.className)}
      >
        {status.label}
      </span>
    </button>
  );
}
