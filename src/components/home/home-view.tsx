import { Composer } from "./composer";
import { HistoryList } from "./history-list";

type HomeViewProps = {
  onSubmit: (prompt: string) => void;
  onOpenTask: (id: string) => void;
  refreshKey?: number;
};

export function HomeView({
  onSubmit,
  onOpenTask,
  refreshKey = 0
}: HomeViewProps) {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-4 py-12">
        <Composer onSubmit={onSubmit} />
        <HistoryList onOpenTask={onOpenTask} refreshKey={refreshKey} />
      </div>
    </main>
  );
}
