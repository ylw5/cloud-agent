import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatRelativeTime, type TaskMeta } from "@/lib/storage";
import { getTaskStatusBadgeProps } from "@/lib/task-status";
import { cn } from "@/lib/utils";

type HistoryItemProps = {
  task: TaskMeta;
  onOpen: (id: string) => void;
};

export function HistoryItem({ task, onOpen }: HistoryItemProps) {
  const title = task.title || "New task";
  const badge = getTaskStatusBadgeProps(task.status);

  return (
    <button
      aria-label={`Open task: ${title}`}
      className="flex w-full items-start gap-4 rounded-lg text-left transition-colors hover:bg-muted/95 p-3"
      onClick={() => onOpen(task.id)}
      type="button"
    >
      <Card className="flex h-16 w-24 shrink-0 flex-col items-start justify-between rounded-lg p-2 shadow-none">
        <Badge
          className={cn("text-[10px]", badge.className)}
          variant={badge.variant}
        >
          {task.status}
        </Badge>
      </Card>
      <div className="min-w-0 flex-1 py-1">
        <div className="truncate font-medium text-foreground">{title}</div>
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {formatRelativeTime(task.updatedAt)}
        </div>
      </div>
    </button>
  );
}
