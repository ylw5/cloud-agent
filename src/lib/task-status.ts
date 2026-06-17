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

export function getTaskStatusLabelProps(status: TaskStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "idle":
      return { label: "等待中", className: "text-muted-foreground" };
    case "running":
      return { label: "运行中", className: "text-foreground" };
    case "done":
      return {
        label: "完成",
        className: "text-green-600 dark:text-green-400"
      };
    case "error":
      return { label: "失败", className: "text-red-600 dark:text-red-400" };
  }
}
