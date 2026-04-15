"use client";

import PocketBase from "pocketbase";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import ScouterModal, { type ScouterStats } from "@/components/ScouterModal";

type LeaderboardRow = {
  id: string;
  userId: string;
  username: string;
  score: number;
  streak: number;
  powerLevel: number;
};

export type LeaderboardItem = {
  id: string;
  user_id: string;
  score?: number;
  streak?: number;
  expand?: {
    user_id?: {
      username?: string;
    };
  };
};

export type PBListResult<T> = {
  items: T[];
};

const pbUrl = process.env.NEXT_PUBLIC_PB_URL as string;

function createPBClient() {
  // Client-side instance is OK (each browser has its own memory space)
  return new PocketBase(pbUrl);
}

export default function Leaderboard(props: { initialItems?: LeaderboardItem[] }) {
  const [rows, setRows] = useState<LeaderboardRow[]>(() => {
    const items = props.initialItems ?? [];
    return items.map((it) => ({
      id: it.id,
      userId: it.user_id,
      username: it.expand?.user_id?.username ?? `لاعب #${it.user_id.slice(0, 6)}`,
      score: Number(it.score ?? 0),
      streak: Number(it.streak ?? 0),
      powerLevel: 0,
    }));
  });
  const [scouterOpen, setScouterOpen] = useState(false);
  const [scouterStats, setScouterStats] = useState<ScouterStats | null>(null);

  const pb = useMemo(() => createPBClient(), []);

  async function loadInitial() {
    const list = (await pb.collection("leaderboard").getList(1, 20, {
      sort: "-score,-streak,created",
      expand: "user_id",
      requestKey: "leaderboard_initial",
    })) as PBListResult<LeaderboardItem>;

    const mapped: LeaderboardRow[] = list.items.map((it) => ({
      id: it.id,
      userId: it.user_id,
      username:
        it.expand?.user_id?.username ?? `لاعب #${it.user_id.slice(0, 6)}`,
      score: Number(it.score ?? 0),
      streak: Number(it.streak ?? 0),
      powerLevel: 0,
    }));

    setRows(mapped);
  }

  useEffect(() => {
    if (!props.initialItems?.length) {
      loadInitial().catch(() => {
        // ignore UI errors for now
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md dark:bg-black/20">
      <ScouterModal
        open={scouterOpen}
        onClose={() => setScouterOpen(false)}
        stats={scouterStats}
      />
      <h3 className="mb-4 text-lg font-bold text-white">لوحة الصدارة</h3>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r, idx) => (
            <motion.button
              type="button"
              key={r.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
              onClick={() => {
                setScouterStats({
                  username: r.username,
                  score: r.score,
                  streak: r.streak,
                  powerLevel: r.powerLevel,
                });
                setScouterOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-start hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
                  {idx + 1}
                </div>

                <div className="text-white/90">
                  <div className="text-sm font-semibold">{r.username}</div>
                  <div className="text-xs text-white/60">
                    Streak: {r.streak}
                  </div>
                </div>
              </div>

              <div className="text-end">
                <div className="text-sm font-bold text-white">{r.score}</div>
                <div className="text-xs text-white/60">نقطة</div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
