import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatRelativeTime,
  type TaskMeta,
  type TaskStatus
} from "@/lib/storage";

const statusVariant: Record<
  TaskStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  idle: "secondary",
  running: "default",
  done: "secondary",
  error: "destructive"
};

type HistoryItemProps = {
  task: TaskMeta;
  onOpen: (id: string) => void;
};

export function HistoryItem({ task, onOpen }: HistoryItemProps) {
  const title = task.title || "New task";

  return (
    <button
      aria-label={`Open task: ${title}`}
      className="flex w-full items-start gap-4 rounded-lg text-left transition-colors hover:bg-muted/50"
      onClick={() => onOpen(task.id)}
      type="button"
    >
      <Card className="flex h-16 w-24 shrink-0 flex-col items-start justify-between rounded-lg p-2 shadow-none">
        <Badge className="text-[10px]" variant={statusVariant[task.status]}>
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
