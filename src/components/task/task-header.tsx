import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TaskMeta, TaskStatus } from "@/lib/storage";
import { getTaskStatusBadgeProps } from "@/lib/task-status";
import { cn } from "@/lib/utils";

type TaskHeaderProps = {
  title: string;
  meta: TaskMeta | undefined;
  status?: TaskStatus;
  onBack: () => void;
};

export function TaskHeader({
  title,
  meta,
  status,
  onBack
}: TaskHeaderProps) {
  const displayStatus = status ?? meta?.status;
  const badge = displayStatus
    ? getTaskStatusBadgeProps(displayStatus)
    : undefined;

  return (
    <header className="flex shrink-0 items-center gap-3 border-b bg-muted/30 px-4 py-3">
      <Button onClick={onBack} size="icon-sm" type="button" variant="ghost">
        <ArrowLeftIcon className="size-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-medium">
            {title || "New task"}
          </h1>
          {badge ? (
            <Badge
              className={cn("shrink-0 capitalize", badge.className)}
              variant={badge.variant}
            >
              {displayStatus}
            </Badge>
          ) : null}
        </div>
      </div>
    </header>
  );
}
