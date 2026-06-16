import { Composer } from "./composer";
import { HistoryList } from "./history-list";

type HomeViewProps = {
  onSubmit: (prompt: string) => void | Promise<void>;
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
        <div className="space-y-2 text-center">
          <h1 className="font-semibold text-3xl font-mono">Luna Cloud Agent</h1>
        </div>
        <Composer onSubmit={onSubmit} />
        <HistoryList onOpenTask={onOpenTask} refreshKey={refreshKey} />
      </div>
    </main>
  );
}
