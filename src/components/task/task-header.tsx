import { ArrowLeftIcon, MoreHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { TaskMeta } from "@/lib/storage";

type TaskHeaderProps = {
  title: string;
  meta: TaskMeta | undefined;
  running: boolean;
  onBack: () => void;
  onStop: () => void;
  onClear: () => void;
  onNewTask: () => void;
};

export function TaskHeader({
  title,
  meta,
  running,
  onBack,
  onStop,
  onClear,
  onNewTask
}: TaskHeaderProps) {
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
          {meta ? (
            <Badge className="shrink-0 capitalize" variant="secondary">
              {meta.status}
            </Badge>
          ) : null}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" type="button" variant="ghost">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {running ? (
            <DropdownMenuItem onClick={onStop}>Stop</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={onClear}>Clear history</DropdownMenuItem>
          <DropdownMenuItem onClick={onNewTask}>New task</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
