import LeaderboardServer from "@/components/LeaderboardServer";
import LeaderboardSkeleton from "@/components/LeaderboardSkeleton";
import { Suspense } from "react";

export default function QuizLeaderboardPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-zinc-950 px-4 py-6 text-white lg:px-6 lg:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <h1 className="text-2xl font-black tracking-tight">لوحة الصدارة</h1>
          <p className="mt-1 text-sm text-white/60">أفضل اللاعبين في السلسلة</p>
        </div>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardServer />
        </Suspense>
      </div>
    </main>
  );
}
