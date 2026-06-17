import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { getTasks, type TaskMeta } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { HistoryItem } from "./history-item";

type HistoryListProps = {
  refreshKey?: number;
  onOpenTask: (id: string) => void;
};

type HistoryTab = "tasks" | "review" | "archive";

type TaskGroup = {
  label: string;
  tasks: TaskMeta[];
};

const TABS: { id: HistoryTab; label: string }[] = [
  { id: "tasks", label: "任务" }
];

const GROUP_ORDER = ["今天", "昨天", "过去 7 天", "本月", "更早"] as const;

function getPeriodLabel(iso: string): string {
  const date = dayjs(iso);
  const now = dayjs();

  if (date.isSame(now, "day")) return "今天";
  if (date.isSame(now.subtract(1, "day"), "day")) return "昨天";
  if (date.isAfter(now.subtract(7, "day").startOf("day"))) return "过去 7 天";
  if (date.isSame(now, "month")) return "本月";
  return "更早";
}

function groupTasksByPeriod(tasks: TaskMeta[]): TaskGroup[] {
  const groups = new Map<string, TaskMeta[]>();

  for (const task of tasks) {
    const label = getPeriodLabel(task.updatedAt);
    const bucket = groups.get(label);
    if (bucket) bucket.push(task);
    else groups.set(label, [task]);
  }

  return GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({
    label,
    tasks: groups.get(label)!
  }));
}

function HistorySkeleton() {
  return (
    <div>
      <div className="py-3 text-xs text-muted-foreground">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="flex items-start justify-between gap-4 border-b border-border py-4"
          key={index}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function HistoryEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-48 items-center justify-center py-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function HistoryList({ refreshKey = 0, onOpenTask }: HistoryListProps) {
  const [tasks, setTasks] = useState<TaskMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HistoryTab>("tasks");

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

  const groups = useMemo(() => groupTasksByPeriod(tasks), [tasks]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b border-border">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              className={cn(
                "relative pb-3 text-sm transition-colors",
                activeTab === tab.id
                  ? "font-medium text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-6">
        {activeTab !== "tasks" ? (
          <HistoryEmpty message="暂无记录" />
        ) : loading ? (
          <HistorySkeleton />
        ) : tasks.length === 0 ? (
          <HistoryEmpty message="暂无任务" />
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="px-1.5 py-3 text-xs text-muted-foreground">
                {group.label}
              </div>
              {group.tasks.map((task) => (
                <HistoryItem key={task.id} onOpen={onOpenTask} task={task} />
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
