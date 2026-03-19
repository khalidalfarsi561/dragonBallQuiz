export default function LeaderboardSkeleton() {
  return (
    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md dark:bg-black/20">
      <div className="mb-4 h-6 w-32 rounded bg-white/10 animate-pulse" />

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`sk_${i}`}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 text-end">
              <div className="h-3 w-14 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-10 rounded bg-white/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
