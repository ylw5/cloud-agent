import { getTasks } from "@/lib/storage";
import { HistoryItem } from "./history-item";

type HistoryListProps = {
  refreshKey?: number;
  onOpenTask: (id: string) => void;
};

export function HistoryList({ refreshKey = 0, onOpenTask }: HistoryListProps) {
  void refreshKey;
  const tasks = getTasks();

  if (tasks.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">No tasks yet</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <HistoryItem key={task.id} onOpen={onOpenTask} task={task} />
      ))}
    </div>
  );
}
