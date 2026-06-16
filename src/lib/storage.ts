export type TaskStatus = "idle" | "running" | "done" | "error";

export type TaskMeta = {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

const KEYS = {
  tasks: "cloud-agent:tasks"
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function migrateTasks(raw: unknown): TaskMeta[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    const now = new Date().toISOString();
    return (raw as string[]).map((id) => ({
      id,
      title: "",
      status: "idle" as const,
      createdAt: now,
      updatedAt: now
    }));
  }
  return raw as TaskMeta[];
}

export function getTasks(): TaskMeta[] {
  return migrateTasks(readJson(KEYS.tasks, []));
}

export function upsertTask(meta: TaskMeta) {
  const tasks = getTasks().filter((task) => task.id !== meta.id);
  writeJson(KEYS.tasks, [meta, ...tasks].slice(0, 20));
}

export function updateTask(id: string, patch: Partial<Omit<TaskMeta, "id">>) {
  const tasks = getTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return;
  const updated = {
    ...tasks[index],
    ...patch,
    updatedAt: new Date().toISOString()
  };
  tasks[index] = updated;
  writeJson(KEYS.tasks, tasks);
}

export function getTask(id: string): TaskMeta | undefined {
  return getTasks().find((task) => task.id === id);
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
