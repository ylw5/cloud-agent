export type TaskStatus = "idle" | "running" | "done" | "error";

export type TaskMeta = {
  id: string;
  title: string;
  repo: string;
  branch: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type SelectedRepo = {
  repo: string;
  branch: string;
};

const KEYS = {
  repos: "cloud-agent:repos",
  selected: "cloud-agent:selected",
  tasks: "cloud-agent:tasks",
  branches: (repo: string) => `cloud-agent:branches:${repo}`
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
      repo: "",
      branch: "",
      status: "idle" as const,
      createdAt: now,
      updatedAt: now
    }));
  }
  return raw as TaskMeta[];
}

export function getRepos(): string[] {
  return readJson<string[]>(KEYS.repos, []);
}

export function addRepo(repo: string) {
  const trimmed = repo.trim();
  if (!trimmed) return;
  const repos = getRepos();
  if (!repos.includes(trimmed)) {
    writeJson(KEYS.repos, [trimmed, ...repos]);
  }
  const branches = getBranches(trimmed);
  if (branches.length === 0) {
    writeJson(KEYS.branches(trimmed), ["main"]);
  }
}

export function getBranches(repo: string): string[] {
  return readJson<string[]>(KEYS.branches(repo), ["main"]);
}

export function addBranch(repo: string, branch: string) {
  const trimmed = branch.trim();
  if (!trimmed) return;
  const branches = getBranches(repo);
  if (!branches.includes(trimmed)) {
    writeJson(KEYS.branches(repo), [trimmed, ...branches]);
  }
}

export function getSelected(): SelectedRepo {
  const selected = readJson<SelectedRepo | null>(KEYS.selected, null);
  const repos = getRepos();
  if (selected && repos.includes(selected.repo)) {
    return selected;
  }
  const repo = repos[0] ?? "";
  const branch = repo ? (getBranches(repo)[0] ?? "main") : "main";
  return { repo, branch };
}

export function setSelected(selected: SelectedRepo) {
  writeJson(KEYS.selected, selected);
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

export function buildTaskPrompt(repo: string, branch: string, prompt: string) {
  if (!repo) return prompt;
  return `Repository: ${repo}\nBranch: ${branch}\n\n${prompt}`;
}

const REPO_PREFIX = /^Repository: .+\nBranch: .+\n\n/;

export function stripRepoContext(text: string) {
  return text.replace(REPO_PREFIX, "");
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
