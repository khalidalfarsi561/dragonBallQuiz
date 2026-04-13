"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export type ScouterStats = {
  username: string;
  score: number;
  streak: number;
  powerLevel: number;
};

export function ScouterModal({
  open,
  onClose,
  stats,
}: {
  open: boolean;
  onClose: () => void;
  stats: ScouterStats | null;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const danger = (stats?.powerLevel ?? 0) >= 9000;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-xl"
          >
            {/* Glass highlight */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/15 via-transparent to-transparent" />

            <div className="relative">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold tracking-widest text-white/70">SCOUTER</div>
                  <h3 className="text-lg font-extrabold">{stats?.username ?? "..."}</h3>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  إغلاق
                </button>
              </div>

              {/* Stats area */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
                {/* Scanline effect */}
                <motion.div
                  className="pointer-events-none absolute inset-x-0 h-10 opacity-80"
                  style={{
                    background: danger
                      ? "linear-gradient(to bottom, rgba(255,80,80,0), rgba(255,80,80,0.55), rgba(255,80,80,0))"
                      : "linear-gradient(to bottom, rgba(60,255,160,0), rgba(60,255,160,0.55), rgba(60,255,160,0))",
                    filter: "blur(0.2px)",
                  }}
                  initial={{ y: "-20%" }}
                  animate={{ y: "120%" }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                />

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] font-semibold text-white/60">النقاط</div>
                    <div className="mt-1 text-base font-extrabold">{stats?.score ?? 0}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] font-semibold text-white/60">Streak</div>
                    <div className="mt-1 text-base font-extrabold">{stats?.streak ?? 0}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] font-semibold text-white/60">مستوى الطاقة</div>
                    <div className="mt-1 text-base font-extrabold">{stats?.powerLevel ?? 0}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                  <span className="font-semibold">{danger ? "تحذير: مستوى خطر مرتفع" : "قراءة مستقرة"}</span>
                  <span className="font-mono opacity-70">{danger ? "RED" : "GREEN"}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                يتم تحديث البيانات من الخادم. انقر خارج النافذة أو اضغط ESC للإغلاق.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ScouterModal;
