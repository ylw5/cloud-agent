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
    <main className="flex h-dvh flex-col bg-muted/30">
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4">
        <div className="shrink-0 space-y-8 pt-16 pb-6">
          <div className="space-y-2 text-center">
            <h1 className="font-brand font-medium text-3xl">
              Luna Cloud Agent
            </h1>
          </div>
          <Composer onSubmit={onSubmit} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col pb-6">
          <HistoryList onOpenTask={onOpenTask} refreshKey={refreshKey} />
        </div>
      </div>
    </main>
  );
}
