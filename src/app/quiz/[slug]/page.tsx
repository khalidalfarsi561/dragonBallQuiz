import AuthModal from "@/components/AuthModal";
import QuizUI from "@/components/QuizUI";
import type { UserRecord } from "@/lib/pocketbase";
import { createPBServerClient } from "@/lib/pocketbase";
import { getQuestionForUser } from "@/lib/questions";
import { dragonBallSeries } from "@/lib/series";
import { notFound } from "next/navigation";

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
    <div className="min-h-screen bg-zinc-950 text-white">
      <QuizUI
        question={q?.question ?? null}
        questionToken={q?.token ?? null}
        username={user.display_name || user.username}
        powerLevel={Number(user.power_level ?? 0)}
        avatarSrc={user.avatar_url || "/vercel.svg"}
      />
    </div>
  );
}
