import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export type TaskStatus = "idle" | "running" | "done" | "error";

export type TaskMeta = {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function getTasks(): Promise<TaskMeta[]> {
  return api("/api/tasks?limit=100");
}

export function createTask(input: {
  id: string;
  title?: string;
}): Promise<TaskMeta> {
  return api("/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function getTask(id: string): Promise<TaskMeta | undefined> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<TaskMeta>;
}

export function formatRelativeTime(iso: string): string {
  return dayjs(iso).fromNow();
}

export function formatTaskDate(iso: string): string {
  return dayjs(iso).format("M月D日");
}
