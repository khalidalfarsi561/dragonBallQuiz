import AuthModal from "@/components/AuthModal";
import LeaderboardServer from "@/components/LeaderboardServer";
import LeaderboardSkeleton from "@/components/LeaderboardSkeleton";
import QuizUI from "@/components/QuizUI";
import type { UserRecord } from "@/lib/pocketbase";
import { createPBServerClient } from "@/lib/pocketbase";
import { getOnePublicQuestion } from "@/lib/questions";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return <AuthModal />;
  }

  const userId = pb.authStore.record.id;
  const user = await pb.collection<UserRecord>("users").getOne(userId, { requestKey: `me_${userId}` });

  const question = await getOnePublicQuestion();

  return (
    <QuizUI
      question={question}
      username={user.username}
      powerLevel={Number(user.power_level ?? 0)}
      avatarSrc="/vercel.svg"
      leaderboardSlot={
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardServer />
        </Suspense>
      }
    />
  );
}
