import "server-only";

import type { LeaderboardRecord } from "@/lib/pocketbase";
import { createPBAdminClient } from "@/lib/pocketbase";
import Leaderboard, { type LeaderboardItem } from "@/components/Leaderboard";

export default async function LeaderboardServer() {
  const adminPb = await createPBAdminClient();

  // Fetch first page only; client component will handle realtime updates after hydration.
  const list = await adminPb.collection<LeaderboardRecord>("leaderboard").getList(1, 20, {
    sort: "-score,-streak,created",
    expand: "user_id",
    requestKey: "leaderboard_ssr_initial",
  });

  // تمرير البيانات كبداية لتقليل زمن التحميل مع Suspense
  return <Leaderboard initialItems={list.items as unknown as LeaderboardItem[]} />;
}
