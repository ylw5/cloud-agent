import { useState } from "react";
import { HomeView } from "@/components/home/home-view";
import { TaskView } from "@/components/task/task-view";
import { buildTaskPrompt, getSelected, upsertTask } from "@/lib/storage";

type View =
  | { kind: "home" }
  | { kind: "task"; taskId: string; initialPrompt?: string };

export default function App() {
  const [view, setView] = useState<View>({ kind: "home" });
  const [refreshKey, setRefreshKey] = useState(0);

  function bumpRefresh() {
    setRefreshKey((key) => key + 1);
  }

  function openTask(id: string) {
    setView({ kind: "task", taskId: id });
  }

  function handleHomeSubmit(prompt: string) {
    const { repo, branch } = getSelected();
    if (!repo) return;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const fullPrompt = buildTaskPrompt(repo, branch, prompt);

    upsertTask({
      id,
      title: prompt.slice(0, 80),
      repo,
      branch,
      status: "running",
      createdAt: now,
      updatedAt: now
    });

    bumpRefresh();
    setView({ kind: "task", taskId: id, initialPrompt: fullPrompt });
  }

  function handleNewTask() {
    const { repo, branch } = getSelected();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    upsertTask({
      id,
      title: "",
      repo,
      branch,
      status: "idle",
      createdAt: now,
      updatedAt: now
    });

    bumpRefresh();
    setView({ kind: "task", taskId: id });
  }

  if (view.kind === "task") {
    return (
      <TaskView
        initialPrompt={view.initialPrompt}
        onBack={() => {
          bumpRefresh();
          setView({ kind: "home" });
        }}
        onMetaChange={bumpRefresh}
        onNewTask={handleNewTask}
        taskId={view.taskId}
      />
    );
  }

  return (
    <HomeView
      onOpenTask={openTask}
      onSubmit={handleHomeSubmit}
      refreshKey={refreshKey}
    />
  );
}
