import { HomeView } from "@/components/home/home-view";
import { TaskView } from "@/components/task/task-view";
import { createTask } from "@/lib/storage";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route element={<HomeRoute />} path="/" />
      <Route element={<TaskRoute />} path="/tasks/:taskId" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

function HomeRoute() {
  const navigate = useNavigate();

  function openTask(id: string) {
    navigate(`/tasks/${encodeURIComponent(id)}`);
  }

  async function handleHomeSubmit(prompt: string) {
    const id = crypto.randomUUID();

    await createTask({ id, title: prompt.slice(0, 80) });
    navigate(`/tasks/${encodeURIComponent(id)}`, {
      state: { initialPrompt: prompt }
    });
  }

  return <HomeView onOpenTask={openTask} onSubmit={handleHomeSubmit} />;
}

function TaskRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { taskId } = useParams();

  if (!taskId) {
    return <Navigate replace to="/" />;
  }

  return (
    <TaskView
      initialPrompt={getInitialPrompt(location.state)}
      onBack={() => navigate("/")}
      taskId={taskId}
    />
  );
}

function getInitialPrompt(state: unknown) {
  return typeof state === "object" &&
    state !== null &&
    "initialPrompt" in state &&
    typeof state.initialPrompt === "string"
    ? state.initialPrompt
    : undefined;
}
