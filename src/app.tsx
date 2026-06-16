import { useState } from "react";
import { HomeView } from "@/components/home/home-view";
import { TaskView } from "@/components/task/task-view";
import { createTask } from "@/lib/storage";

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

  async function handleHomeSubmit(prompt: string) {
    const id = crypto.randomUUID();

    await createTask({ id, title: prompt.slice(0, 80) });
    bumpRefresh();
    setView({ kind: "task", taskId: id, initialPrompt: prompt });
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
