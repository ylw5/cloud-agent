import { useEffect, useState } from "react";
import { getTasks } from "@/lib/storage";
import type { TaskMeta } from "@/lib/storage";
import { HistoryItem } from "./history-item";

type HistoryListProps = {
  refreshKey?: number;
  onOpenTask: (id: string) => void;
};

export function HistoryList({ refreshKey = 0, onOpenTask }: HistoryListProps) {
  const [tasks, setTasks] = useState<TaskMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getTasks()
      .then((items) => {
        if (!ignore) setTasks(items);
      })
      .catch(() => {
        if (!ignore) setTasks([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground">Loading</p>;
  }

  if (tasks.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">No tasks yet</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <HistoryItem key={task.id} onOpen={onOpenTask} task={task} />
      ))}
    </div>
  );
}
