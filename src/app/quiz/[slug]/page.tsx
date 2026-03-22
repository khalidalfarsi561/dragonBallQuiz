import AuthModal from "@/components/AuthModal";
import QuizUI from "@/components/QuizUI";
import type { UserRecord } from "@/lib/pocketbase";
import { createPBServerClient } from "@/lib/pocketbase";
import { getQuestionForUser } from "@/lib/questions";
import { dragonBallSeries } from "@/lib/series";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function QuizSeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const series = dragonBallSeries.find((item) => item.slug === slug);

  if (!series) {
    notFound();
  }

  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return <AuthModal />;
  }

  const userId = pb.authStore.record.id;
  const user = await pb
    .collection<UserRecord>("users")
    .getOne(userId, { requestKey: `me_${userId}` });

  const q = await getQuestionForUser(userId, slug);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-4 text-white lg:px-6 lg:py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <nav className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-linear-to-r from-amber-500 via-orange-500 to-red-500 px-3 py-1 text-xs font-black text-white shadow-lg shadow-orange-950/30">
              السلسلة الحالية
            </span>
            <span className="hidden text-sm text-white/60 md:inline">
              {series.name}
            </span>
          </div>

          <Link
            href="/quiz/leaderboard"
            className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            لوحة الصدارة
          </Link>
        </nav>

        <div className="flex justify-center">
          <section className="flex w-full max-w-2xl min-w-0 flex-col gap-6">
            <QuizUI
              question={q?.question ?? null}
              questionToken={q?.token ?? null}
              username={user.display_name || user.username}
              powerLevel={Number(user.power_level ?? 0)}
              avatarSrc={user.avatar_url || "/vercel.svg"}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
