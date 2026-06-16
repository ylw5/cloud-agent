import type { TaskStatus } from "./storage";

type TaskStatusBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function getTaskStatusBadgeProps(status: TaskStatus): {
  variant: TaskStatusBadgeVariant;
  className?: string;
} {
  switch (status) {
    case "idle":
      return { variant: "secondary" };
    case "running":
      return { variant: "default" };
    case "done":
      return {
        variant: "outline",
        className:
          "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
      };
    case "error":
      return { variant: "destructive" };
  }
}
