"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

type QuizCardProps = {
  title?: string;
  children: React.ReactNode;

  /**
   * منطقة أعلى البطاقة (يمين/يسار العنوان) لعرض معلومات مثل:
   * - مستوى الصعوبة
   * - رقم السؤال / التقدم
   * - مؤقت
   */
  headerSlot?: React.ReactNode;

  /**
   * استخدمها لتفعيل حركة الانزلاق (صحيح) أو الاهتزاز (خطأ).
   * يفضّل تغيير القيمة (toggle / increment key) عند كل إجابة.
   */
  feedback?: "idle" | "correct" | "wrong";
};

export default function QuizCard({
  title,
  children,
  headerSlot,
  feedback = "idle",
}: QuizCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const animate = useMemo(() => {
    if (shouldReduceMotion) return { x: 0, y: 0, rotate: 0, scale: 1 };

    if (feedback === "wrong") {
      // Screen shake (spring-ish) + slight rotation for "violent" impact
      return {
        x: [0, -18, 18, -16, 16, -12, 12, -8, 8, 0],
        rotate: [0, -2, 2, -2, 2, -1, 1, 0],
      };
    }

    if (feedback === "correct") {
      // Smooth slide in + gentle scale (keyframes => use tween in transition below)
      return {
        x: [0, 14, 0],
        y: [0, -4, 0],
        scale: [1, 1.02, 1],
      };
    }

    return { x: 0, y: 0, rotate: 0, scale: 1 };
  }, [feedback, shouldReduceMotion]);

  const transition = useMemo(() => {
    if (shouldReduceMotion) return { duration: 0 } as const;

    if (feedback === "wrong") {
      // Keyframes arrays (x/rotate) لا تعمل مع spring (يدعم فقط keyframeين)
      // لذلك نستخدم tween مع مدة قصيرة.
      return {
        type: "tween",
        duration: 0.4,
        ease: "easeOut",
      } as const;
    }

    if (feedback === "correct") {
      // keyframes arrays لا تعمل مع spring (يدعم فقط keyframeين)
      return {
        type: "tween",
        duration: 0.45,
        ease: "easeOut",
      } as const;
    }

    return { duration: 0.15 } as const;
  }, [feedback, shouldReduceMotion]);

  const feedbackFrameClass =
    feedback === "correct"
      ? "border-emerald-400/30 ring-1 ring-emerald-400/10 shadow-emerald-500/10"
      : feedback === "wrong"
        ? "border-rose-400/30 ring-1 ring-rose-400/10 shadow-rose-500/10"
        : "border-white/10 ring-1 ring-white/5 shadow-black/20";

  return (
    <motion.div
      animate={animate}
      transition={transition}
      className={[
        "relative w-full rounded-2xl border bg-white/5 p-5 shadow-lg backdrop-blur-md dark:bg-black/20",
        feedbackFrameClass,
      ].join(" ")}
    >
      {title ? (
        <div className="mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">{title}</h2>

            <div className="flex items-center gap-2">
              {headerSlot ? <div className="shrink-0">{headerSlot}</div> : null}

              {feedback !== "idle" ? (
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
                    feedback === "correct"
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-400/30 bg-rose-500/10 text-rose-100",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {feedback === "correct" ? "إجابة صحيحة" : "إجابة خاطئة"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="text-white/90">{children}</div>
    </motion.div>
  );
}
