"use client";

import PocketBase from "pocketbase";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type LeaderboardRow = {
  id: string;
  user: string; // user record id
  score: number;
  streak: number;
};

type LeaderboardItem = {
  id: string;
  user: string;
  score?: number;
  streak?: number;
};

type PBListResult<T> = {
  items: T[];
};

const pbUrl = process.env.NEXT_PUBLIC_PB_URL as string;

function createPBClient() {
  // Client-side instance is OK (each browser has its own memory space)
  return new PocketBase(pbUrl);
}

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const pb = useMemo(() => createPBClient(), []);

  async function loadInitial() {
    const list = (await pb.collection("leaderboard").getList(1, 20, {
      sort: "-score,-streak,created",
      requestKey: "leaderboard_initial",
    })) as PBListResult<LeaderboardItem>;

    const mapped: LeaderboardRow[] = list.items.map((it) => ({
      id: it.id,
      user: it.user,
      score: Number(it.score ?? 0),
      streak: Number(it.streak ?? 0),
    }));

    setRows(mapped);
  }

  useEffect(() => {
    let unsub: (() => Promise<void>) | null = null;

    loadInitial().catch(() => {
      // ignore UI errors for now
    });

    pb.realtime
      .subscribe("leaderboard", async () => {
        // reload top 20 on each change (simple + reliable)
        await loadInitial();
      })
      .then((u) => {
        unsub = u;
      })
      .catch(() => {
        unsub = null;
      });

    return () => {
      if (unsub) void unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md dark:bg-black/20">
      <h3 className="mb-4 text-lg font-bold text-white">لوحة الصدارة</h3>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r, idx) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
                  {idx + 1}
                </div>

                <div className="text-white/90">
                  <div className="text-sm font-semibold">لاعب #{r.user.slice(0, 6)}</div>
                  <div className="text-xs text-white/60">Streak: {r.streak}</div>
                </div>
              </div>

              <div className="text-end">
                <div className="text-sm font-bold text-white">{r.score}</div>
                <div className="text-xs text-white/60">نقطة</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
